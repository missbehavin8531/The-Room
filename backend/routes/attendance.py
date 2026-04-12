from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
import uuid
import logging
from datetime import datetime, timezone, timedelta

from database import db
from models import AttendanceCreate, AttendanceResponse
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


@router.post("/attendance", response_model=AttendanceResponse)
async def record_attendance(data: AttendanceCreate, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': data.lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    existing = await db.attendance.find_one({
        'lesson_id': data.lesson_id, 
        'user_id': user['id'], 
        'action': data.action
    })
    if existing:
        return AttendanceResponse(**{k: v for k, v in existing.items() if k != '_id'})
    
    attendance_id = str(uuid.uuid4())
    attendance = {
        'id': attendance_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'lesson_id': data.lesson_id,
        'action': data.action,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.attendance.insert_one(attendance)

    # When user marks attended, also mark lesson as completed (unlocks next lesson)
    if data.action == 'marked_attended':
        existing_completion = await db.lesson_completions.find_one({
            'lesson_id': data.lesson_id,
            'user_id': user['id']
        })
        if not existing_completion:
            await db.lesson_completions.insert_one({
                'id': str(uuid.uuid4()),
                'lesson_id': data.lesson_id,
                'course_id': lesson.get('course_id', ''),
                'user_id': user['id'],
                'completed_at': datetime.now(timezone.utc).isoformat()
            })

    return AttendanceResponse(**attendance)

@router.get("/attendance/lesson/{lesson_id}", response_model=List[AttendanceResponse])
async def get_lesson_attendance(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    records = await db.attendance.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(1000)
    return [AttendanceResponse(**r) for r in records]

@router.get("/attendance/lesson/{lesson_id}/summary")
async def get_lesson_attendance_summary(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    pipeline = [
        {'$match': {'lesson_id': lesson_id}},
        {'$group': {
            '_id': {'action': '$action', 'user_id': '$user_id'},
            'user_name': {'$first': '$user_name'}
        }},
        {'$group': {
            '_id': '$_id.action',
            'count': {'$sum': 1},
            'users': {'$push': '$user_name'}
        }}
    ]
    results = await db.attendance.aggregate(pipeline).to_list(10)
    return {r['_id']: {'count': r['count'], 'users': r['users']} for r in results}

@router.get("/attendance/my/{lesson_id}")
async def get_my_attendance(lesson_id: str, user: dict = Depends(require_approved)):
    records = await db.attendance.find({'lesson_id': lesson_id, 'user_id': user['id']}, {'_id': 0}).to_list(100)
    actions = list(set([r['action'] for r in records]))
    return {'actions': actions}


# ============== ATTENDANCE REPORTS ==============

@router.get("/attendance/report")
async def get_attendance_report(
    course_id: Optional[str] = None,
    lesson_id: Optional[str] = None,
    user: dict = Depends(require_teacher_or_admin)
):
    query = {}
    if lesson_id:
        query['lesson_id'] = lesson_id
    elif course_id:
        lessons = await db.lessons.find({'course_id': course_id}, {'id': 1}).to_list(100)
        lesson_ids = [ls['id'] for ls in lessons]
        query['lesson_id'] = {'$in': lesson_ids}
    
    attendance = await db.attendance.find(query, {'_id': 0}).to_list(10000)
    
    user_attendance = {}
    for record in attendance:
        uid = record['user_id']
        if uid not in user_attendance:
            user_attendance[uid] = {
                'user_id': uid,
                'user_name': record.get('user_name', 'Unknown'),
                'lessons_attended': set(),
                'actions': []
            }
        user_attendance[uid]['lessons_attended'].add(record['lesson_id'])
        user_attendance[uid]['actions'].append(record['action'])
    
    report = []
    for uid, data in user_attendance.items():
        report.append({
            'user_id': uid,
            'user_name': data['user_name'],
            'lessons_attended': len(data['lessons_attended']),
            'joined_video': data['actions'].count('joined_video'),
            'watched_replay': data['actions'].count('watched_replay'),
            'marked_complete': data['actions'].count('marked_complete')
        })
    
    report.sort(key=lambda x: x['lessons_attended'], reverse=True)
    return {'report': report}

@router.get("/attendance/summary")
async def get_attendance_summary(user: dict = Depends(require_teacher_or_admin)):
    total_users = await db.users.count_documents({'role': 'member', 'is_approved': True})
    total_lessons = await db.lessons.count_documents({'is_published': True})
    total_attendance = await db.attendance.count_documents({})
    total_completions = await db.lesson_completions.count_documents({})
    
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent_attendance = await db.attendance.count_documents({
        'recorded_at': {'$gte': week_ago}
    })
    
    return {
        'total_members': total_users,
        'total_lessons': total_lessons,
        'total_attendance_records': total_attendance,
        'total_completions': total_completions,
        'attendance_last_7_days': recent_attendance,
        'avg_attendance_rate': round((total_completions / (total_users * total_lessons) * 100), 1) if total_users and total_lessons else 0
    }


# ============== ATTENDANCE EDIT/RESET ==============

@router.delete("/attendance/reset")
async def reset_attendance(
    course_id: Optional[str] = None,
    user: dict = Depends(require_teacher_or_admin)
):
    if course_id:
        lessons = await db.lessons.find({'course_id': course_id}, {'id': 1}).to_list(100)
        lesson_ids = [ls['id'] for ls in lessons]
        r1 = await db.attendance.delete_many({'lesson_id': {'$in': lesson_ids}})
        r2 = await db.lesson_completions.delete_many({'course_id': course_id})
        return {'message': f'Reset attendance for course. Deleted {r1.deleted_count} records and {r2.deleted_count} completions.'}
    else:
        r1 = await db.attendance.delete_many({})
        r2 = await db.lesson_completions.delete_many({})
        return {'message': f'Reset all attendance. Deleted {r1.deleted_count} records and {r2.deleted_count} completions.'}

@router.delete("/attendance/user/{user_id}")
async def delete_user_attendance(user_id: str, user: dict = Depends(require_teacher_or_admin)):
    r1 = await db.attendance.delete_many({'user_id': user_id})
    r2 = await db.lesson_completions.delete_many({'user_id': user_id})
    return {'message': f'Deleted {r1.deleted_count} attendance records and {r2.deleted_count} completions for user.'}

@router.put("/attendance/{attendance_id}")
async def update_attendance_record(
    attendance_id: str,
    action: str = Query(...),
    user: dict = Depends(require_teacher_or_admin)
):
    if action not in ['joined_video', 'watched_replay', 'marked_complete']:
        raise HTTPException(status_code=400, detail="Invalid action type")
    result = await db.attendance.update_one({'id': attendance_id}, {'$set': {'action': action}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return {'message': 'Attendance record updated'}
