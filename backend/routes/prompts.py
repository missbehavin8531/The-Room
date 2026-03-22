from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import List
import uuid
import re
import logging
from datetime import datetime, timezone

from database import db
from models import (
    TeacherPromptCreate, TeacherPromptResponse,
    PromptReplyCreate, PromptReplyResponse,
    PrivateFeedbackCreate, PrivateFeedbackResponse,
    PromptResponseCreate, PromptResponseModel
)
from auth import require_approved, require_teacher_or_admin
from services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ============== TEACHER PROMPTS ==============

@router.post("/lessons/{lesson_id}/prompts", response_model=TeacherPromptResponse)
async def create_teacher_prompt(lesson_id: str, data: TeacherPromptCreate, user: dict = Depends(require_teacher_or_admin)):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    count = await db.teacher_prompts.count_documents({'lesson_id': lesson_id})
    if count >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 prompts per lesson")
    
    prompt_id = str(uuid.uuid4())
    prompt = {
        'id': prompt_id,
        'lesson_id': lesson_id,
        'question': data.question,
        'order': data.order or count,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.teacher_prompts.insert_one(prompt)
    return TeacherPromptResponse(**prompt)

@router.get("/lessons/{lesson_id}/prompts", response_model=List[TeacherPromptResponse])
async def get_lesson_prompts(lesson_id: str, user: dict = Depends(require_approved)):
    prompts = await db.teacher_prompts.find({'lesson_id': lesson_id}, {'_id': 0}).sort('order', 1).to_list(10)
    return [TeacherPromptResponse(**p) for p in prompts]

@router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, data: TeacherPromptCreate, user: dict = Depends(require_teacher_or_admin)):
    result = await db.teacher_prompts.update_one(
        {'id': prompt_id},
        {'$set': {'question': data.question, 'order': data.order}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {'message': 'Prompt updated'}

@router.delete("/prompts/{prompt_id}")
async def delete_teacher_prompt(prompt_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.teacher_prompts.delete_one({'id': prompt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.prompt_replies.delete_many({'prompt_id': prompt_id})
    return {'message': 'Prompt deleted'}


# ============== PROMPT REPLIES ==============

def extract_mentions(text: str) -> list:
    pattern = r'@(\w+)'
    return re.findall(pattern, text)

async def send_push_notification_inline(user_id: str, title: str, body: str, url: str = '/'):
    """Inline push notification for mentions"""
    from database import VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_CLAIMS_EMAIL
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        return
    try:
        from pywebpush import webpush, WebPushException
        import json
        subscriptions = await db.push_subscriptions.find({'user_id': user_id}, {'_id': 0}).to_list(10)
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={'endpoint': sub['endpoint'], 'keys': sub['keys']},
                    data=json.dumps({'title': title, 'body': body, 'url': url}),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={'sub': f'mailto:{VAPID_CLAIMS_EMAIL}'}
                )
            except WebPushException as e:
                if e.response and e.response.status_code == 410:
                    await db.push_subscriptions.delete_one({'endpoint': sub['endpoint']})
                logger.error(f"Push notification failed: {e}")
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")

async def notify_mentions(text: str, sender_name: str, lesson_title: str, reply_id: str, background_tasks: BackgroundTasks):
    mentions = extract_mentions(text)
    if not mentions:
        return
    
    for username in mentions:
        user = await db.users.find_one({
            'name': {'$regex': f'^{username}', '$options': 'i'},
            'is_approved': True
        }, {'_id': 0})
        
        if user:
            await send_push_notification_inline(
                user['id'],
                f'{sender_name} mentioned you',
                f'In "{lesson_title}": {text[:100]}...' if len(text) > 100 else f'In "{lesson_title}": {text}',
                f'/lessons/{reply_id}'
            )
            
            if user.get('email'):
                background_tasks.add_task(
                    email_service.send_email,
                    user['email'],
                    f'{sender_name} mentioned you in The Room',
                    email_service.get_base_template(f'''
                        <h2 style="color: #333; margin-top: 0;">You were mentioned!</h2>
                        <p style="color: #555; line-height: 1.6;">
                            <strong>{sender_name}</strong> mentioned you in a discussion for <strong>{lesson_title}</strong>:
                        </p>
                        <div style="background-color: #f9f9f6; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4a5d4a;">
                            <p style="margin: 0; color: #555;">{text}</p>
                        </div>
                    ''')
                )


@router.post("/prompts/{prompt_id}/reply", response_model=PromptReplyResponse)
async def reply_to_prompt(prompt_id: str, data: PromptReplyCreate, background_tasks: BackgroundTasks, user: dict = Depends(require_approved)):
    prompt = await db.teacher_prompts.find_one({'id': prompt_id})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot respond")
    
    lesson = await db.lessons.find_one({'id': prompt['lesson_id']}, {'_id': 0})
    
    reply_id = str(uuid.uuid4())
    reply = {
        'id': reply_id,
        'prompt_id': prompt_id,
        'lesson_id': prompt['lesson_id'],
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_pinned': False,
        'status': 'pending',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.prompt_replies.insert_one(reply)
    
    if lesson:
        await notify_mentions(
            data.content,
            user['name'],
            lesson.get('title', 'a lesson'),
            prompt['lesson_id'],
            background_tasks
        )
    
    return PromptReplyResponse(**reply)

@router.get("/prompts/{prompt_id}/replies", response_model=List[PromptReplyResponse])
async def get_prompt_replies(prompt_id: str, user: dict = Depends(require_approved)):
    replies = await db.prompt_replies.find({'prompt_id': prompt_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    replies.sort(key=lambda x: (not x.get('is_pinned', False), x['created_at']))
    return [PromptReplyResponse(**r) for r in replies]

@router.put("/replies/{reply_id}/pin")
async def pin_reply(reply_id: str, pinned: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.prompt_replies.update_one({'id': reply_id}, {'$set': {'is_pinned': pinned}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': f'Reply {"pinned" if pinned else "unpinned"}'}

@router.put("/replies/{reply_id}/status")
async def update_reply_status(reply_id: str, status: str = Query(...), user: dict = Depends(require_teacher_or_admin)):
    if status not in ['pending', 'answered', 'needs_followup']:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.prompt_replies.update_one({'id': reply_id}, {'$set': {'status': status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': f'Status updated to {status}'}

@router.delete("/replies/{reply_id}")
async def delete_reply(reply_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.prompt_replies.delete_one({'id': reply_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': 'Reply deleted'}

@router.get("/lessons/{lesson_id}/all-replies")
async def get_all_lesson_replies(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    prompts = await db.teacher_prompts.find({'lesson_id': lesson_id}, {'_id': 0}).sort('order', 1).to_list(10)
    
    result = []
    for prompt in prompts:
        replies = await db.prompt_replies.find({'prompt_id': prompt['id']}, {'_id': 0}).sort('created_at', 1).to_list(1000)
        replies.sort(key=lambda x: (not x.get('is_pinned', False), x['created_at']))
        result.append({
            'prompt': prompt,
            'replies': replies,
            'stats': {
                'total': len(replies),
                'pending': len([r for r in replies if r.get('status') == 'pending']),
                'answered': len([r for r in replies if r.get('status') == 'answered']),
                'needs_followup': len([r for r in replies if r.get('status') == 'needs_followup']),
                'pinned': len([r for r in replies if r.get('is_pinned')])
            }
        })
    
    return {
        'lesson': lesson,
        'prompts_with_replies': result,
        'total_replies': sum(p['stats']['total'] for p in result)
    }


# ============== PRIVATE FEEDBACK ==============

@router.post("/replies/{reply_id}/feedback", response_model=PrivateFeedbackResponse)
async def create_private_feedback(
    reply_id: str,
    data: PrivateFeedbackCreate,
    background_tasks: BackgroundTasks,
    user: dict = Depends(require_teacher_or_admin)
):
    reply = await db.prompt_replies.find_one({'id': reply_id}, {'_id': 0})
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    student = await db.users.find_one({'id': reply['user_id']}, {'_id': 0})
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    prompt = await db.teacher_prompts.find_one({'id': reply['prompt_id']}, {'_id': 0})
    lesson = await db.lessons.find_one({'id': prompt['lesson_id']}, {'_id': 0}) if prompt else None
    
    feedback_id = str(uuid.uuid4())
    feedback = {
        'id': feedback_id,
        'reply_id': reply_id,
        'teacher_id': user['id'],
        'teacher_name': user['name'],
        'student_id': reply['user_id'],
        'student_name': reply['user_name'],
        'content': data.content,
        'created_at': datetime.now(timezone.utc).isoformat(),
        'is_read': False
    }
    await db.private_feedback.insert_one(feedback)
    
    if student.get('email') and lesson:
        background_tasks.add_task(
            email_service.send_teacher_reply_notification,
            student['email'],
            student['name'],
            user['name'],
            lesson.get('title', 'a lesson'),
            is_private=True
        )
    
    return PrivateFeedbackResponse(**feedback)

@router.get("/replies/{reply_id}/feedback", response_model=List[PrivateFeedbackResponse])
async def get_feedback_for_reply(reply_id: str, user: dict = Depends(require_approved)):
    reply = await db.prompt_replies.find_one({'id': reply_id}, {'_id': 0})
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")
    
    if user['role'] not in ['teacher', 'admin'] and user['id'] != reply['user_id']:
        raise HTTPException(status_code=403, detail="Not authorized to view this feedback")
    
    feedback = await db.private_feedback.find({'reply_id': reply_id}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return [PrivateFeedbackResponse(**f) for f in feedback]

@router.get("/my-feedback", response_model=List[PrivateFeedbackResponse])
async def get_my_feedback(user: dict = Depends(require_approved)):
    feedback = await db.private_feedback.find(
        {'student_id': user['id']},
        {'_id': 0}
    ).sort('created_at', -1).to_list(100)
    return [PrivateFeedbackResponse(**f) for f in feedback]

@router.get("/my-feedback/unread-count")
async def get_unread_feedback_count(user: dict = Depends(require_approved)):
    count = await db.private_feedback.count_documents({
        'student_id': user['id'],
        'is_read': False
    })
    return {'unread_count': count}

@router.put("/feedback/{feedback_id}/read")
async def mark_feedback_read(feedback_id: str, user: dict = Depends(require_approved)):
    result = await db.private_feedback.update_one(
        {'id': feedback_id, 'student_id': user['id']},
        {'$set': {'is_read': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return {'message': 'Feedback marked as read'}


# ============== OLD PROMPT RESPONSES (backwards compat) ==============

@router.post("/lessons/{lesson_id}/respond", response_model=PromptResponseModel)
async def respond_to_prompt_legacy(lesson_id: str, data: PromptResponseCreate, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    existing = await db.prompt_responses.find_one({'lesson_id': lesson_id, 'user_id': user['id']})
    if existing:
        await db.prompt_responses.update_one(
            {'id': existing['id']},
            {'$set': {'content': data.content, 'created_at': datetime.now(timezone.utc).isoformat()}}
        )
        existing['content'] = data.content
        existing['created_at'] = datetime.now(timezone.utc).isoformat()
        return PromptResponseModel(**{k: v for k, v in existing.items() if k != '_id'})
    
    response_id = str(uuid.uuid4())
    response = {
        'id': response_id,
        'lesson_id': lesson_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.prompt_responses.insert_one(response)
    return PromptResponseModel(**response)

@router.get("/lessons/{lesson_id}/responses", response_model=List[PromptResponseModel])
async def get_prompt_responses(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    responses = await db.prompt_responses.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(1000)
    return [PromptResponseModel(**r) for r in responses]
