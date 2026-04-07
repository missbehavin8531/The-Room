from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
import uuid
from datetime import datetime, timezone

from database import db
from models import (
    CommentCreate, CommentResponse,
    ChatMessageCreate, ChatMessageResponse,
    PrivateMessageCreate, PrivateMessageResponse
)
from auth import require_approved, require_teacher_or_admin, require_non_guest

router = APIRouter(prefix="/api")


# ============== COMMENTS ==============

@router.post("/lessons/{lesson_id}/comments", response_model=CommentResponse)
async def create_comment(lesson_id: str, data: CommentCreate, user: dict = Depends(require_non_guest)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot post")
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")
    
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    comment_id = str(uuid.uuid4())
    comment = {
        'id': comment_id,
        'lesson_id': lesson_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_hidden': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment)
    return CommentResponse(**comment)

@router.get("/lessons/{lesson_id}/comments", response_model=List[CommentResponse])
async def get_comments(lesson_id: str, user: dict = Depends(require_approved)):
    query = {'lesson_id': lesson_id}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    comments = await db.comments.find(query, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return [CommentResponse(**c) for c in comments]

@router.put("/comments/{comment_id}/hide")
async def hide_comment(comment_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.update_one({'id': comment_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': f'Comment {"hidden" if hidden else "shown"}'}

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.delete_one({'id': comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': 'Comment deleted'}


# ============== GLOBAL CHAT ==============

@router.post("/chat", response_model=ChatMessageResponse)
async def send_chat_message(data: ChatMessageCreate, user: dict = Depends(require_non_guest)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot chat")
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_hidden': False,
        'group_id': user.get('group_id'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(message)
    return ChatMessageResponse(**message)

@router.get("/chat", response_model=List[ChatMessageResponse])
async def get_chat_messages(limit: int = 100, user: dict = Depends(require_approved)):
    query = {}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    group_id = user.get('group_id')
    if group_id:
        query['group_id'] = group_id
    messages = await db.chat_messages.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return [ChatMessageResponse(**m) for m in reversed(messages)]

@router.put("/chat/{message_id}/hide")
async def hide_chat_message(message_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.update_one({'id': message_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': f'Message {"hidden" if hidden else "shown"}'}

@router.delete("/chat/{message_id}")
async def delete_chat_message(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.delete_one({'id': message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': 'Message deleted'}


# ============== PRIVATE MESSAGES ==============

@router.post("/messages", response_model=PrivateMessageResponse)
async def send_private_message(data: PrivateMessageCreate, user: dict = Depends(require_non_guest)):
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    teacher = await db.users.find_one({'id': data.teacher_id, 'role': {'$in': ['teacher', 'admin']}}, {'_id': 0})
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
    
    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'sender_id': user['id'],
        'sender_name': user['name'],
        'teacher_id': data.teacher_id,
        'teacher_name': teacher['name'],
        'content': data.content,
        'is_read': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.private_messages.insert_one(message)
    return PrivateMessageResponse(**message)

@router.get("/messages/inbox", response_model=List[PrivateMessageResponse])
async def get_inbox(user: dict = Depends(require_approved)):
    if user['role'] == 'teacher':
        messages = await db.private_messages.find({'teacher_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    else:
        messages = await db.private_messages.find({'sender_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return [PrivateMessageResponse(**m) for m in messages]

@router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.private_messages.update_one({'id': message_id}, {'$set': {'is_read': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': 'Marked as read'}
