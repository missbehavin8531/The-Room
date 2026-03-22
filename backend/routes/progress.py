from fastapi import APIRouter, Depends
from datetime import datetime, timezone, timedelta, date

from database import db
from models import UserProgressResponse, CourseProgressResponse
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


async def calculate_streak(user_id: str) -> int:
    completions = await db.lesson_completions.find(
        {'user_id': user_id},
        {'_id': 0, 'completed_at': 1}
    ).sort('completed_at', -1).to_list(365)
    
    if not completions:
        return 0
    
    dates = set()
    for c in completions:
        try:
            dt = datetime.fromisoformat(c['completed_at'].replace('Z', '+00:00'))
            dates.add(dt.date())
        except Exception:
            pass
    
    if not dates:
        return 0
    
    today = date.today()
    streak = 0
    current_date = today
    
    if current_date not in dates and (current_date - timedelta(days=1)) not in dates:
        return 0
    
    if current_date not in dates:
        current_date = current_date - timedelta(days=1)
    
    while current_date in dates:
        streak += 1
        current_date = current_date - timedelta(days=1)
    
    return streak


@router.get("/my-progress", response_model=UserProgressResponse)
async def get_my_progress(user: dict = Depends(require_approved)):
    user_id = user['id']
    
    enrollments = await db.enrollments.find({'user_id': user_id}, {'_id': 0}).to_list(100)
    enrolled_course_ids = [e['course_id'] for e in enrollments]
    
    courses_progress = []
    for course_id in enrolled_course_ids:
        course = await db.courses.find_one({'id': course_id}, {'_id': 0})
        if not course:
            continue
        
        total_lessons = await db.lessons.count_documents({'course_id': course_id, 'is_published': True})
        completed_lessons = await db.lesson_completions.count_documents({
            'course_id': course_id,
            'user_id': user_id
        })
        
        last_completion = await db.lesson_completions.find_one(
            {'course_id': course_id, 'user_id': user_id},
            {'_id': 0},
            sort=[('completed_at', -1)]
        )
        
        progress_percent = (completed_lessons / total_lessons * 100) if total_lessons > 0 else 0
        
        courses_progress.append(CourseProgressResponse(
            course_id=course_id,
            course_title=course.get('title', 'Unknown'),
            total_lessons=total_lessons,
            completed_lessons=completed_lessons,
            progress_percent=round(progress_percent, 1),
            last_activity=last_completion.get('completed_at') if last_completion else None
        ))
    
    streak_days = await calculate_streak(user_id)
    
    last_activity = await db.lesson_completions.find_one(
        {'user_id': user_id},
        {'_id': 0},
        sort=[('completed_at', -1)]
    )
    
    total_lessons_completed = await db.lesson_completions.count_documents({'user_id': user_id})
    
    return UserProgressResponse(
        user_id=user_id,
        user_name=user['name'],
        total_courses_enrolled=len(enrolled_course_ids),
        total_lessons_completed=total_lessons_completed,
        courses=courses_progress,
        streak_days=streak_days,
        last_activity=last_activity.get('completed_at') if last_activity else None
    )


@router.get("/teacher/student-progress")
async def get_student_progress(user: dict = Depends(require_teacher_or_admin)):
    members = await db.users.find(
        {'role': 'member', 'is_approved': True},
        {'_id': 0, 'id': 1, 'name': 1, 'email': 1}
    ).to_list(500)
    
    student_progress = []
    for member in members:
        enrollments = await db.enrollments.count_documents({'user_id': member['id']})
        completions = await db.lesson_completions.count_documents({'user_id': member['id']})
        
        last_activity = await db.lesson_completions.find_one(
            {'user_id': member['id']},
            {'_id': 0},
            sort=[('completed_at', -1)]
        )
        
        student_progress.append({
            'user_id': member['id'],
            'user_name': member['name'],
            'email': member['email'],
            'courses_enrolled': enrollments,
            'lessons_completed': completions,
            'last_activity': last_activity.get('completed_at') if last_activity else None
        })
    
    student_progress.sort(key=lambda x: x['lessons_completed'], reverse=True)
    return {'students': student_progress}
