from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from typing import Optional
import json
import logging
from datetime import datetime, timezone, timedelta

from database import db, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_CLAIMS_EMAIL
from models import (
    PushSubscriptionCreate, ReadingReminderSettings, AnalyticsResponse
)
from auth import require_approved, require_teacher_or_admin, require_admin
from services.email_service import email_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ============== SEARCH ==============

@router.get("/search")
async def search(q: str = Query(..., min_length=1), user: dict = Depends(require_approved)):
    query_regex = {'$regex': q, '$options': 'i'}
    is_teacher = user['role'] in ['teacher', 'admin']
    group_id = user.get('group_id')
    
    course_query = {'$or': [{'title': query_regex}, {'description': query_regex}]}
    if not is_teacher:
        course_query['is_published'] = True
    if group_id:
        course_query['group_id'] = group_id
    courses = await db.courses.find(course_query, {'_id': 0}).limit(10).to_list(10)
    
    # Get course_ids for this group to scope lessons
    group_course_ids = [c['id'] for c in courses] if group_id else None
    
    lesson_query = {'$or': [{'title': query_regex}, {'description': query_regex}]}
    if not is_teacher:
        lesson_query['is_published'] = True
    if group_course_ids is not None:
        all_group_courses = await db.courses.find(
            {'group_id': group_id} if group_id else {},
            {'_id': 0, 'id': 1}
        ).to_list(1000)
        all_group_course_ids = [c['id'] for c in all_group_courses]
        lesson_query['course_id'] = {'$in': all_group_course_ids}
    lessons = await db.lessons.find(lesson_query, {'_id': 0}).limit(10).to_list(10)
    
    replies = await db.prompt_replies.find(
        {'content': query_regex},
        {'_id': 0}
    ).limit(10).to_list(10)
    
    discussion_results = []
    for r in replies:
        user_name = ''
        if r.get('user_id'):
            reply_user = await db.users.find_one({'id': r['user_id']}, {'_id': 0, 'name': 1})
            if reply_user:
                user_name = reply_user.get('name', '')
        discussion_results.append({
            'id': r['id'],
            'content': r['content'][:100],
            'lesson_id': r.get('lesson_id'),
            'user_name': user_name,
            'type': 'discussion'
        })
    
    return {
        'courses': [{'id': c['id'], 'title': c['title'], 'description': c.get('description', ''), 'type': 'course'} for c in courses],
        'lessons': [{'id': l['id'], 'title': l['title'], 'description': l.get('description', ''), 'course_id': l.get('course_id'), 'type': 'lesson'} for l in lessons],
        'discussions': discussion_results
    }


# ============== ANALYTICS ==============

@router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(user: dict = Depends(require_admin)):
    group_id = user.get('group_id')
    user_query = {'group_id': group_id} if group_id else {}
    course_query = {'group_id': group_id} if group_id else {}
    chat_query = {'group_id': group_id} if group_id else {}
    
    total_users = await db.users.count_documents(user_query)
    approved_users = await db.users.count_documents({**user_query, 'is_approved': True})
    pending_users = await db.users.count_documents({**user_query, 'is_approved': False})
    total_courses = await db.courses.count_documents(course_query)
    total_lessons = await db.lessons.count_documents({})
    total_comments = await db.comments.count_documents({})
    total_chat = await db.chat_messages.count_documents(chat_query)
    attendance = await db.attendance.count_documents({})
    
    return AnalyticsResponse(
        total_users=total_users,
        approved_users=approved_users,
        pending_users=pending_users,
        total_courses=total_courses,
        total_lessons=total_lessons,
        total_comments=total_comments,
        total_chat_messages=total_chat,
        attendance_records=attendance
    )

@router.get("/analytics/participation")
async def get_participation_stats(user: dict = Depends(require_admin)):
    pipeline = [
        {'$group': {'_id': '$user_id', 'user_name': {'$first': '$user_name'}, 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10}
    ]
    top_commenters = await db.comments.aggregate(pipeline).to_list(10)
    top_chatters = await db.chat_messages.aggregate(pipeline).to_list(10)
    
    return {
        'top_commenters': [{'user_id': t['_id'], 'user_name': t['user_name'], 'count': t['count']} for t in top_commenters],
        'top_chatters': [{'user_id': t['_id'], 'user_name': t['user_name'], 'count': t['count']} for t in top_chatters]
    }


# ============== EMAIL NOTIFICATION TRIGGERS ==============

@router.post("/notifications/send-lesson-reminders")
async def send_lesson_reminders(background_tasks: BackgroundTasks, user: dict = Depends(require_teacher_or_admin)):
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime('%Y-%m-%d')
    
    lessons = await db.lessons.find({
        'lesson_date': tomorrow,
        'is_published': True
    }, {'_id': 0}).to_list(100)
    
    emails_queued = 0
    for lesson in lessons:
        course = await db.courses.find_one({'id': lesson['course_id']}, {'_id': 0})
        if not course:
            continue
        
        enrollments = await db.enrollments.find({'course_id': lesson['course_id']}, {'_id': 0}).to_list(500)
        
        for enrollment in enrollments:
            enrolled_user = await db.users.find_one({'id': enrollment['user_id']}, {'_id': 0})
            if enrolled_user and enrolled_user.get('email'):
                background_tasks.add_task(
                    email_service.send_lesson_reminder,
                    enrolled_user['email'],
                    enrolled_user['name'],
                    lesson['title'],
                    course['title'],
                    lesson['lesson_date']
                )
                emails_queued += 1
    
    return {'message': f'Queued {emails_queued} reminder emails for {len(lessons)} lessons'}


# ============== PUSH NOTIFICATIONS ==============

@router.get("/push/vapid-public-key")
async def get_vapid_public_key():
    return {'publicKey': VAPID_PUBLIC_KEY}

@router.post("/push/subscribe")
async def subscribe_to_push(data: PushSubscriptionCreate, user: dict = Depends(require_approved)):
    subscription = {
        'user_id': user['id'],
        'endpoint': data.endpoint,
        'keys': data.keys,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    
    await db.push_subscriptions.update_one(
        {'user_id': user['id'], 'endpoint': data.endpoint},
        {'$set': subscription},
        upsert=True
    )
    
    return {'message': 'Subscribed to push notifications'}

@router.delete("/push/unsubscribe")
async def unsubscribe_from_push(endpoint: str, user: dict = Depends(require_approved)):
    await db.push_subscriptions.delete_one({
        'user_id': user['id'],
        'endpoint': endpoint
    })
    return {'message': 'Unsubscribed from push notifications'}

async def send_push_notification(user_id: str, title: str, body: str, url: str = '/'):
    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured, skipping push notification")
        return
    
    try:
        from pywebpush import webpush, WebPushException
        
        subscriptions = await db.push_subscriptions.find({'user_id': user_id}, {'_id': 0}).to_list(10)
        
        for sub in subscriptions:
            try:
                webpush(
                    subscription_info={'endpoint': sub['endpoint'], 'keys': sub['keys']},
                    data=json.dumps({'title': title, 'body': body, 'url': url}),
                    vapid_private_key=VAPID_PRIVATE_KEY,
                    vapid_claims={'sub': f'mailto:{VAPID_CLAIMS_EMAIL}'}
                )
                logger.info(f"Push notification sent to user {user_id}")
            except WebPushException as e:
                if e.response and e.response.status_code == 410:
                    await db.push_subscriptions.delete_one({'endpoint': sub['endpoint']})
                logger.error(f"Push notification failed: {e}")
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")


# ============== READING PLAN REMINDERS ==============

@router.get("/reading-reminders/settings")
async def get_reading_reminder_settings(user: dict = Depends(require_approved)):
    settings = await db.reading_reminder_settings.find_one({'user_id': user['id']}, {'_id': 0})
    if not settings:
        return {'enabled': False, 'reminder_time': '08:00'}
    return settings

@router.put("/reading-reminders/settings")
async def update_reading_reminder_settings(data: ReadingReminderSettings, user: dict = Depends(require_approved)):
    await db.reading_reminder_settings.update_one(
        {'user_id': user['id']},
        {'$set': {
            'user_id': user['id'],
            'enabled': data.enabled,
            'reminder_time': data.reminder_time,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {'message': 'Settings updated'}

@router.post("/reading-reminders/send")
async def send_reading_reminders(background_tasks: BackgroundTasks, user: dict = Depends(require_teacher_or_admin)):
    settings = await db.reading_reminder_settings.find({'enabled': True}, {'_id': 0}).to_list(1000)
    
    notifications_sent = 0
    for setting in settings:
        user_data = await db.users.find_one({'id': setting['user_id']}, {'_id': 0})
        if not user_data:
            continue
        
        await send_push_notification(
            setting['user_id'],
            'Daily Reading Reminder',
            "Don't forget your daily scripture reading!",
            '/'
        )
        
        if user_data.get('email'):
            background_tasks.add_task(
                email_service.send_email,
                user_data['email'],
                'Daily Reading Reminder - The Room',
                email_service.get_base_template(f'''
                    <h2 style="color: #333; margin-top: 0;">Daily Reading Reminder</h2>
                    <p style="color: #555; line-height: 1.6;">
                        Hi {user_data['name']},
                    </p>
                    <p style="color: #555; line-height: 1.6;">
                        This is your daily reminder to spend time in God's Word today. 
                        Check your current lesson for today's reading plan.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="#" style="display: inline-block; background-color: #4a5d4a; color: #ffffff; padding: 14px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            View Reading Plan
                        </a>
                    </div>
                ''')
            )
        
        notifications_sent += 1
    
    return {'message': f'Sent {notifications_sent} reading reminders'}
