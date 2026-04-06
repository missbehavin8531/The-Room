from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse
from typing import List, Optional
from pathlib import Path
from datetime import date
import os
import uuid
from datetime import datetime, timezone

from database import db, UPLOAD_DIR, MAX_UPLOAD_SIZE
from models import (
    LessonBase, LessonCreate, LessonResponse, ResourceResponse
)
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


async def get_lesson_with_details(lesson: dict, user_id: str, user_role: str = 'member'):
    resources = await db.resources.find({'lesson_id': lesson['id']}, {'_id': 0}).sort('order', 1).to_list(100)
    prompts = await db.teacher_prompts.find({'lesson_id': lesson['id']}, {'_id': 0}).sort('order', 1).to_list(10)
    attendance_records = await db.attendance.find({'lesson_id': lesson['id'], 'user_id': user_id}, {'_id': 0}).to_list(100)
    user_attendance = list(set([r['action'] for r in attendance_records]))
    
    completion = await db.lesson_completions.find_one({'lesson_id': lesson['id'], 'user_id': user_id})
    is_completed = completion is not None
    
    is_unlocked = True
    if user_role not in ['teacher', 'admin']:
        course = await db.courses.find_one({'id': lesson['course_id']}, {'_id': 0})
        unlock_type = course.get('unlock_type', 'sequential') if course else 'sequential'
        
        if unlock_type == 'scheduled':
            lesson_date = lesson.get('lesson_date')
            if lesson_date:
                try:
                    lesson_date_obj = date.fromisoformat(lesson_date)
                    today = date.today()
                    is_unlocked = lesson_date_obj <= today
                except (ValueError, TypeError):
                    is_unlocked = True
            else:
                is_unlocked = True
        else:
            prev_lesson = await db.lessons.find_one(
                {'course_id': lesson['course_id'], 'order': {'$lt': lesson.get('order', 0)}, 'is_published': True},
                sort=[('order', -1)]
            )
            if prev_lesson:
                prev_completion = await db.lesson_completions.find_one({
                    'lesson_id': prev_lesson['id'],
                    'user_id': user_id
                })
                is_unlocked = prev_completion is not None
            if lesson.get('order', 1) == 1:
                is_unlocked = True
    
    youtube_url = lesson.get('youtube_url') or (lesson.get('recording_url') if lesson.get('recording_source') == 'youtube' else None)
    
    return LessonResponse(
        **{k: v for k, v in lesson.items() if k != 'youtube_url'},
        youtube_url=youtube_url,
        resources=resources,
        prompts=prompts,
        user_attendance=user_attendance,
        is_completed=is_completed,
        is_unlocked=is_unlocked
    )


async def get_lessons_batch(lessons: list, user_id: str, user_role: str = 'member'):
    """Batch-fetch related data for multiple lessons to avoid N+1 queries."""
    if not lessons:
        return []

    lesson_ids = [ls['id'] for ls in lessons]
    course_ids = list(set(ls['course_id'] for ls in lessons))

    # Batch fetch all related data in parallel-style queries (5 queries total instead of 4N+1)
    all_resources = await db.resources.find(
        {'lesson_id': {'$in': lesson_ids}}, {'_id': 0}
    ).sort('order', 1).to_list(5000)

    all_prompts = await db.teacher_prompts.find(
        {'lesson_id': {'$in': lesson_ids}}, {'_id': 0}
    ).sort('order', 1).to_list(1000)

    all_attendance = await db.attendance.find(
        {'lesson_id': {'$in': lesson_ids}, 'user_id': user_id}, {'_id': 0}
    ).to_list(5000)

    all_completions = await db.lesson_completions.find(
        {'lesson_id': {'$in': lesson_ids}, 'user_id': user_id}, {'_id': 0}
    ).to_list(5000)

    # Index by lesson_id for O(1) lookup
    resources_by_lesson = {}
    for r in all_resources:
        resources_by_lesson.setdefault(r['lesson_id'], []).append(r)

    prompts_by_lesson = {}
    for p in all_prompts:
        prompts_by_lesson.setdefault(p['lesson_id'], []).append(p)

    attendance_by_lesson = {}
    for a in all_attendance:
        attendance_by_lesson.setdefault(a['lesson_id'], set()).add(a['action'])

    completed_lessons = set(c['lesson_id'] for c in all_completions)

    # For unlock logic: fetch courses and previous completions
    courses_map = {}
    if user_role not in ['teacher', 'admin']:
        courses = await db.courses.find({'id': {'$in': course_ids}}, {'_id': 0}).to_list(100)
        courses_map = {c['id']: c for c in courses}

    result = []
    for lesson in lessons:
        lid = lesson['id']
        resources = resources_by_lesson.get(lid, [])
        prompts = prompts_by_lesson.get(lid, [])
        user_attendance = list(attendance_by_lesson.get(lid, []))
        is_completed = lid in completed_lessons

        is_unlocked = True
        if user_role not in ['teacher', 'admin']:
            course = courses_map.get(lesson['course_id'], {})
            unlock_type = course.get('unlock_type', 'sequential')

            if unlock_type == 'scheduled':
                lesson_date = lesson.get('lesson_date')
                if lesson_date:
                    try:
                        is_unlocked = date.fromisoformat(lesson_date) <= date.today()
                    except (ValueError, TypeError):
                        is_unlocked = True
            else:
                if lesson.get('order', 1) == 1:
                    is_unlocked = True
                else:
                    prev_lesson_id = None
                    for other in lessons:
                        if other['course_id'] == lesson['course_id'] and other.get('order', 0) < lesson.get('order', 0):
                            if prev_lesson_id is None or other.get('order', 0) > next((l2.get('order', 0) for l2 in lessons if l2['id'] == prev_lesson_id), 0):
                                prev_lesson_id = other['id']
                    if prev_lesson_id:
                        is_unlocked = prev_lesson_id in completed_lessons
                    else:
                        is_unlocked = True

        youtube_url = lesson.get('youtube_url') or (lesson.get('recording_url') if lesson.get('recording_source') == 'youtube' else None)
        result.append(LessonResponse(
            **{k: v for k, v in lesson.items() if k != 'youtube_url'},
            youtube_url=youtube_url,
            resources=resources,
            prompts=prompts,
            user_attendance=user_attendance,
            is_completed=is_completed,
            is_unlocked=is_unlocked
        ))
    return result



@router.post("/lessons", response_model=LessonResponse)
async def create_lesson(data: LessonCreate, user: dict = Depends(require_teacher_or_admin)):
    course = await db.courses.find_one({'id': data.course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    last_lesson = await db.lessons.find_one(
        {'course_id': data.course_id},
        sort=[('order', -1)]
    )
    next_order = (last_lesson.get('order', 0) + 1) if last_lesson else 1
    
    lesson_id = str(uuid.uuid4())
    lesson = {
        'id': lesson_id,
        'course_id': data.course_id,
        'title': data.title,
        'description': data.description,
        'lesson_date': data.lesson_date,
        'teacher_notes': data.teacher_notes,
        'reading_plan': data.reading_plan,
        'hosting_method': data.hosting_method or 'in_app',
        'zoom_link': data.zoom_link,
        'recording_source': data.recording_source or 'none',
        'recording_url': data.recording_url,
        'is_published': data.is_published,
        'order': data.order if data.order > 0 else next_order,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.lessons.insert_one(lesson)
    return LessonResponse(**lesson, resources=[], prompts=[], user_attendance=[], is_completed=False, is_unlocked=True)

@router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
async def get_course_lessons(course_id: str, user: dict = Depends(require_approved)):
    query = {'course_id': course_id}
    if user['role'] not in ['teacher', 'admin']:
        query['is_published'] = True
    
    lessons = await db.lessons.find(query, {'_id': 0}).sort('order', 1).to_list(1000)
    return await get_lessons_batch(lessons, user['id'], user['role'])

@router.get("/lessons/all", response_model=List[LessonResponse])
async def get_all_lessons(user: dict = Depends(require_approved)):
    query = {}
    if user['role'] not in ['teacher', 'admin']:
        query['is_published'] = True
    
    lessons = await db.lessons.find(query, {'_id': 0}).sort('lesson_date', 1).to_list(1000)
    return await get_lessons_batch(lessons, user['id'], user['role'])

@router.get("/lessons/next/upcoming", response_model=Optional[LessonResponse])
async def get_next_lesson(user: dict = Depends(require_approved)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    query = {'lesson_date': {'$gte': today}, 'is_published': True}
    lesson = await db.lessons.find_one(query, {'_id': 0})
    if lesson:
        return await get_lesson_with_details(lesson, user['id'], user['role'])
    lesson = await db.lessons.find_one({'is_published': True}, {'_id': 0}, sort=[('created_at', -1)])
    if lesson:
        return await get_lesson_with_details(lesson, user['id'], user['role'])
    return None

@router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    if user['role'] not in ['teacher', 'admin']:
        if not lesson.get('is_published', False):
            raise HTTPException(status_code=404, detail="Lesson not found")
    
    return await get_lesson_with_details(lesson, user['id'], user['role'])

@router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, data: LessonBase, user: dict = Depends(require_teacher_or_admin)):
    update_data = data.model_dump(exclude_unset=True)
    result = await db.lessons.update_one({'id': lesson_id}, {'$set': update_data})
    if result.modified_count == 0:
        lesson = await db.lessons.find_one({'id': lesson_id})
        if not lesson:
            raise HTTPException(status_code=404, detail="Lesson not found")
    return {'message': 'Lesson updated'}

@router.post("/lessons/{lesson_id}/complete")
async def mark_lesson_complete(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    existing = await db.lesson_completions.find_one({
        'lesson_id': lesson_id,
        'user_id': user['id']
    })
    if existing:
        return {'message': 'Lesson already completed', 'completed_at': existing['completed_at']}
    
    if user['role'] not in ['teacher', 'admin']:
        prev_lesson = await db.lessons.find_one(
            {'course_id': lesson['course_id'], 'order': {'$lt': lesson.get('order', 0)}, 'is_published': True},
            sort=[('order', -1)]
        )
        if prev_lesson:
            prev_completion = await db.lesson_completions.find_one({
                'lesson_id': prev_lesson['id'],
                'user_id': user['id']
            })
            if not prev_completion and lesson.get('order', 1) > 1:
                raise HTTPException(status_code=403, detail="Complete the previous lesson first")
    
    completion = {
        'id': str(uuid.uuid4()),
        'lesson_id': lesson_id,
        'course_id': lesson['course_id'],
        'user_id': user['id'],
        'completed_at': datetime.now(timezone.utc).isoformat()
    }
    await db.lesson_completions.insert_one(completion)
    return {'message': 'Lesson marked as complete', 'completed_at': completion['completed_at']}

@router.delete("/lessons/{lesson_id}/complete")
async def unmark_lesson_complete(lesson_id: str, user: dict = Depends(require_approved)):
    result = await db.lesson_completions.delete_one({
        'lesson_id': lesson_id,
        'user_id': user['id']
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Completion not found")
    return {'message': 'Lesson completion removed'}

@router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.lessons.delete_one({'id': lesson_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.comments.delete_many({'lesson_id': lesson_id})
    await db.resources.delete_many({'lesson_id': lesson_id})
    await db.lesson_completions.delete_many({'lesson_id': lesson_id})
    return {'message': 'Lesson deleted'}

@router.put("/lessons/{lesson_id}/lock")
async def lock_lesson_discussion(lesson_id: str, locked: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.lessons.update_one({'id': lesson_id}, {'$set': {'discussion_locked': locked}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {'message': f'Discussion {"locked" if locked else "unlocked"}'}


# ============== FILE UPLOADS / RESOURCES ==============

@router.post("/lessons/{lesson_id}/resources")
async def upload_resource(
    lesson_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    allowed_types = ['application/pdf', 'application/vnd.ms-powerpoint', 
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                     'image/jpeg', 'image/png', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, PPT, PPTX, or images.")
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB")
    
    resource_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    stored_filename = f"{resource_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    if 'pdf' in file.content_type:
        file_type = 'pdf'
    elif 'powerpoint' in file.content_type or 'presentation' in file.content_type:
        file_type = 'ppt'
    else:
        file_type = 'image'
    
    # Calculate next order
    existing_count = await db.resources.count_documents({'lesson_id': lesson_id})
    
    resource = {
        'id': resource_id,
        'lesson_id': lesson_id,
        'filename': stored_filename,
        'original_filename': file.filename,
        'file_type': file_type,
        'file_size': len(content),
        'uploaded_by': user['id'],
        'order': existing_count,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.resources.insert_one(resource)
    return ResourceResponse(**resource)

@router.get("/resources/{resource_id}/download")
async def download_resource(resource_id: str, token: str = Query(None)):
    # Allow auth via query param (for <a href> links) or header
    if token:
        from jose import jwt
        try:
            jwt.decode(token, os.environ.get('JWT_SECRET', ''), algorithms=['HS256'])
        except Exception:
            raise HTTPException(status_code=403, detail="Invalid token")
    else:
        raise HTTPException(status_code=403, detail="Authentication required")

    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    file_path = UPLOAD_DIR / resource['filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        file_path,
        filename=resource['original_filename'],
        media_type='application/octet-stream'
    )

@router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, user: dict = Depends(require_teacher_or_admin)):
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    file_path = UPLOAD_DIR / resource['filename']
    if file_path.exists():
        file_path.unlink()
    
    await db.resources.delete_one({'id': resource_id})
    return {'message': 'Resource deleted'}

@router.put("/resources/{resource_id}/primary")
async def set_primary_resource(resource_id: str, user: dict = Depends(require_teacher_or_admin)):
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    await db.resources.update_many(
        {'lesson_id': resource['lesson_id']},
        {'$set': {'is_primary': False}}
    )
    await db.resources.update_one({'id': resource_id}, {'$set': {'is_primary': True}})
    return {'message': 'Resource set as primary'}

@router.put("/resources/{resource_id}/order")
async def update_resource_order(resource_id: str, order: int = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.resources.update_one({'id': resource_id}, {'$set': {'order': order}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {'message': 'Order updated'}

@router.put("/resources/reorder")
async def reorder_resources(items: List[dict], user: dict = Depends(require_teacher_or_admin)):
    for item in items:
        await db.resources.update_one(
            {'id': item['id']},
            {'$set': {'order': item['order']}}
        )
    return {'message': 'Resources reordered'}

@router.put("/resources/{resource_id}/replace")
async def replace_resource(
    resource_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    allowed_types = ['application/pdf', 'application/vnd.ms-powerpoint', 
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                     'image/jpeg', 'image/png', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB")
    
    old_path = UPLOAD_DIR / resource['filename']
    if old_path.exists():
        old_path.unlink()
    
    file_ext = Path(file.filename).suffix
    stored_filename = f"{resource_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    with open(file_path, 'wb') as f:
        f.write(content)
    
    if 'pdf' in file.content_type:
        file_type = 'pdf'
    elif 'powerpoint' in file.content_type or 'presentation' in file.content_type:
        file_type = 'ppt'
    else:
        file_type = 'image'
    
    await db.resources.update_one({'id': resource_id}, {'$set': {
        'filename': stored_filename,
        'original_filename': file.filename,
        'file_type': file_type,
        'file_size': len(content),
        'created_at': datetime.now(timezone.utc).isoformat()
    }})
    
    return {'message': 'Resource replaced'}
