from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Query
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Optional
from pathlib import Path
import uuid
from datetime import datetime, timezone, timedelta
import io

from database import db, UPLOAD_DIR
from models import (
    CourseCreate, CourseUpdate, CourseResponse, EnrollmentResponse
)
from auth import require_approved, require_teacher_or_admin

router = APIRouter(prefix="/api")


@router.post("/courses", response_model=CourseResponse)
async def create_course(data: CourseCreate, user: dict = Depends(require_teacher_or_admin)):
    course_id = str(uuid.uuid4())
    course = {
        'id': course_id,
        'title': data.title,
        'description': data.description,
        'thumbnail_url': data.thumbnail_url,
        'is_published': data.is_published,
        'unlock_type': data.unlock_type,
        'teacher_id': user['id'],
        'teacher_name': user['name'],
        'group_id': user.get('group_id'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    return CourseResponse(**course, lesson_count=0, enrollment_count=0, is_enrolled=False, completed_lessons=0, total_lessons=0)

@router.get("/courses", response_model=List[CourseResponse])
async def get_courses(user: dict = Depends(require_approved)):
    user_id = user['id']
    is_teacher = user['role'] in ['teacher', 'admin']
    group_ids = user.get('group_ids', [])
    group_id = user.get('group_id')
    
    match_stage = {}
    if not is_teacher:
        match_stage['is_published'] = True
    if group_ids:
        match_stage['group_id'] = {'$in': group_ids}
    elif group_id:
        match_stage['group_id'] = group_id
    
    pipeline = [
        {'$match': match_stage},
        {'$lookup': {
            'from': 'lessons',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$is_published', True]}
                ]}}},
                {'$count': 'count'}
            ],
            'as': 'lesson_stats'
        }},
        {'$lookup': {
            'from': 'enrollments',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$eq': ['$course_id', '$$course_id']}}},
                {'$count': 'count'}
            ],
            'as': 'enrollment_stats'
        }},
        {'$lookup': {
            'from': 'enrollments',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$user_id', user_id]}
                ]}}},
                {'$limit': 1}
            ],
            'as': 'user_enrollment'
        }},
        {'$lookup': {
            'from': 'lesson_completions',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$user_id', user_id]}
                ]}}},
                {'$count': 'count'}
            ],
            'as': 'completion_stats'
        }},
        {'$project': {
            '_id': 0,
            'id': 1, 'title': 1, 'description': 1, 'thumbnail_url': 1,
            'is_published': 1, 'unlock_type': 1, 'teacher_id': 1,
            'teacher_name': 1, 'created_at': 1,
            'lesson_count': {'$ifNull': [{'$arrayElemAt': ['$lesson_stats.count', 0]}, 0]},
            'total_lessons': {'$ifNull': [{'$arrayElemAt': ['$lesson_stats.count', 0]}, 0]},
            'enrollment_count': {'$ifNull': [{'$arrayElemAt': ['$enrollment_stats.count', 0]}, 0]},
            'is_enrolled': {'$gt': [{'$size': '$user_enrollment'}, 0]},
            'completed_lessons': {'$ifNull': [{'$arrayElemAt': ['$completion_stats.count', 0]}, 0]}
        }}
    ]
    
    courses = await db.courses.aggregate(pipeline).to_list(1000)
    return [CourseResponse(**c) for c in courses]

@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, user: dict = Depends(require_approved)):
    user_id = user['id']
    is_teacher = user['role'] in ['teacher', 'admin']
    
    pipeline = [
        {'$match': {'id': course_id}},
        {'$lookup': {
            'from': 'lessons',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$is_published', True]}
                ]}}},
                {'$count': 'count'}
            ],
            'as': 'lesson_stats'
        }},
        {'$lookup': {
            'from': 'enrollments',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$eq': ['$course_id', '$$course_id']}}},
                {'$count': 'count'}
            ],
            'as': 'enrollment_stats'
        }},
        {'$lookup': {
            'from': 'enrollments',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$user_id', user_id]}
                ]}}},
                {'$limit': 1}
            ],
            'as': 'user_enrollment'
        }},
        {'$lookup': {
            'from': 'lesson_completions',
            'let': {'course_id': '$id'},
            'pipeline': [
                {'$match': {'$expr': {'$and': [
                    {'$eq': ['$course_id', '$$course_id']},
                    {'$eq': ['$user_id', user_id]}
                ]}}},
                {'$count': 'count'}
            ],
            'as': 'completion_stats'
        }},
        {'$project': {
            '_id': 0,
            'id': 1, 'title': 1, 'description': 1, 'thumbnail_url': 1,
            'is_published': 1, 'unlock_type': 1, 'teacher_id': 1,
            'teacher_name': 1, 'created_at': 1,
            'lesson_count': {'$ifNull': [{'$arrayElemAt': ['$lesson_stats.count', 0]}, 0]},
            'total_lessons': {'$ifNull': [{'$arrayElemAt': ['$lesson_stats.count', 0]}, 0]},
            'enrollment_count': {'$ifNull': [{'$arrayElemAt': ['$enrollment_stats.count', 0]}, 0]},
            'is_enrolled': {'$gt': [{'$size': '$user_enrollment'}, 0]},
            'completed_lessons': {'$ifNull': [{'$arrayElemAt': ['$completion_stats.count', 0]}, 0]}
        }}
    ]
    
    courses = await db.courses.aggregate(pipeline).to_list(1)
    if not courses:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course = courses[0]
    if not is_teacher and not course.get('is_published', False):
        raise HTTPException(status_code=404, detail="Course not found")
    
    return CourseResponse(**course)

@router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseUpdate, user: dict = Depends(require_teacher_or_admin)):
    update_data = data.model_dump(exclude_unset=True, exclude_none=True)
    if not update_data:
        return {'message': 'No changes to update'}
    result = await db.courses.update_one({'id': course_id}, {'$set': update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {'message': 'Course updated'}

@router.post("/courses/{course_id}/publish")
async def publish_course(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    course = await db.courses.find_one({'id': course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.courses.update_one({'id': course_id}, {'$set': {'is_published': True}})
    await db.lessons.update_many({'course_id': course_id}, {'$set': {'is_published': True}})
    return {'message': 'Course and lessons published'}

@router.post("/courses/{course_id}/cover")
async def upload_course_cover(
    course_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    course = await db.courses.find_one({'id': course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed. Use JPEG, PNG, GIF, or WebP.")
    
    content = await file.read()
    max_size = 5 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB for cover images.")
    
    if course.get('cover_filename'):
        old_file_path = UPLOAD_DIR / course['cover_filename']
        if old_file_path.exists():
            old_file_path.unlink()
    
    file_ext = Path(file.filename).suffix
    stored_filename = f"cover_{course_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    await db.courses.update_one(
        {'id': course_id},
        {'$set': {
            'cover_filename': stored_filename,
            'thumbnail_url': f'/api/courses/{course_id}/cover/image'
        }}
    )
    
    return {'message': 'Cover uploaded', 'thumbnail_url': f'/api/courses/{course_id}/cover/image'}

@router.get("/courses/{course_id}/cover/image")
async def get_course_cover(course_id: str):
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course or not course.get('cover_filename'):
        raise HTTPException(status_code=404, detail="Cover not found")
    
    file_path = UPLOAD_DIR / course['cover_filename']
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Cover file not found")
    
    return FileResponse(file_path)

@router.post("/courses/{course_id}/unpublish")
async def unpublish_course(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    await db.courses.update_one({'id': course_id}, {'$set': {'is_published': False}})
    return {'message': 'Course unpublished'}

@router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.courses.delete_one({'id': course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.lessons.delete_many({'course_id': course_id})
    await db.enrollments.delete_many({'course_id': course_id})
    return {'message': 'Course and associated lessons deleted'}


# ============== ENROLLMENTS ==============

@router.post("/courses/{course_id}/enroll", response_model=EnrollmentResponse)
async def enroll_in_course(course_id: str, user: dict = Depends(require_approved)):
    course = await db.courses.find_one({'id': course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    existing = await db.enrollments.find_one({'course_id': course_id, 'user_id': user['id']})
    if existing:
        raise HTTPException(status_code=400, detail="Already enrolled in this course")
    
    enrollment_id = str(uuid.uuid4())
    enrollment = {
        'id': enrollment_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'course_id': course_id,
        'enrolled_at': datetime.now(timezone.utc).isoformat(),
        'progress': 0
    }
    await db.enrollments.insert_one(enrollment)
    return EnrollmentResponse(**enrollment)

@router.delete("/courses/{course_id}/enroll")
async def unenroll_from_course(course_id: str, user: dict = Depends(require_approved)):
    result = await db.enrollments.delete_one({'course_id': course_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return {'message': 'Unenrolled from course'}

@router.get("/enrollments/my", response_model=List[EnrollmentResponse])
async def get_my_enrollments(user: dict = Depends(require_approved)):
    enrollments = await db.enrollments.find({'user_id': user['id']}, {'_id': 0}).to_list(1000)
    return [EnrollmentResponse(**e) for e in enrollments]

@router.get("/courses/{course_id}/enrollments", response_model=List[EnrollmentResponse])
async def get_course_enrollments(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    enrollments = await db.enrollments.find({'course_id': course_id}, {'_id': 0}).to_list(1000)
    return [EnrollmentResponse(**e) for e in enrollments]


# ============== CERTIFICATES ==============

@router.get("/courses/{course_id}/certificate")
async def generate_certificate(course_id: str, user: dict = Depends(require_approved)):
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor
    
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    total_lessons = await db.lessons.count_documents({'course_id': course_id, 'is_published': True})
    completed_lessons = await db.lesson_completions.count_documents({
        'course_id': course_id,
        'user_id': user['id']
    })
    
    if completed_lessons < total_lessons:
        raise HTTPException(
            status_code=400, 
            detail=f"Course not completed. {completed_lessons}/{total_lessons} lessons done."
        )
    
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)
    
    c.setFillColor(HexColor('#f5f5f0'))
    c.rect(0, 0, width, height, fill=1)
    
    c.setStrokeColor(HexColor('#4a5d4a'))
    c.setLineWidth(3)
    c.rect(30, 30, width - 60, height - 60, fill=0)
    c.setLineWidth(1)
    c.rect(40, 40, width - 80, height - 80, fill=0)
    
    c.setFillColor(HexColor('#4a5d4a'))
    c.setFont("Helvetica-Bold", 36)
    c.drawCentredString(width / 2, height - 120, "Certificate of Completion")
    
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor('#666666'))
    c.drawCentredString(width / 2, height - 150, "This is to certify that")
    
    c.setFont("Helvetica-Bold", 28)
    c.setFillColor(HexColor('#333333'))
    c.drawCentredString(width / 2, height - 200, user['name'])
    
    c.setFont("Helvetica", 14)
    c.setFillColor(HexColor('#666666'))
    c.drawCentredString(width / 2, height - 240, "has successfully completed the course")
    
    c.setFont("Helvetica-Bold", 24)
    c.setFillColor(HexColor('#4a5d4a'))
    c.drawCentredString(width / 2, height - 285, course['title'])
    
    c.setFont("Helvetica", 12)
    c.setFillColor(HexColor('#666666'))
    completion_date = datetime.now(timezone.utc).strftime('%B %d, %Y')
    c.drawCentredString(width / 2, height - 330, f"Completed on {completion_date}")
    
    c.setFont("Helvetica-Bold", 16)
    c.setFillColor(HexColor('#4a5d4a'))
    c.drawCentredString(width / 2, 80, "The Room")
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2, 65, "A weekly discipleship hub")
    
    c.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=certificate_{course_id}.pdf"}
    )

@router.get("/courses/{course_id}/progress")
async def get_course_progress(course_id: str, user: dict = Depends(require_approved)):
    total_lessons = await db.lessons.count_documents({'course_id': course_id, 'is_published': True})
    completed_lessons = await db.lesson_completions.count_documents({
        'course_id': course_id,
        'user_id': user['id']
    })
    
    return {
        'course_id': course_id,
        'total_lessons': total_lessons,
        'completed_lessons': completed_lessons,
        'progress_percent': round((completed_lessons / total_lessons * 100) if total_lessons > 0 else 0, 1)
    }
