from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'sunday-school-secret-key-2024')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24

# File upload configuration
UPLOAD_DIR = ROOT_DIR / 'uploads'
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25MB

# Create the main app
app = FastAPI(title="Sunday School Education API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ============== MODELS ==============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "member"  # admin, teacher, member

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    is_approved: bool
    created_at: str

class CourseBase(BaseModel):
    title: str
    description: str
    zoom_link: Optional[str] = None
    thumbnail_url: Optional[str] = None

class CourseCreate(CourseBase):
    pass

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    zoom_link: Optional[str] = None
    thumbnail_url: Optional[str] = None
    teacher_id: str
    teacher_name: str
    created_at: str
    lesson_count: int = 0
    enrollment_count: int = 0
    is_enrolled: bool = False

class LessonBase(BaseModel):
    title: str
    description: str
    youtube_url: Optional[str] = None
    zoom_link: Optional[str] = None  # Override course zoom if set
    lesson_date: Optional[str] = None
    order: int = 0

class LessonCreate(LessonBase):
    course_id: str

class LessonResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    course_id: str
    title: str
    description: str
    youtube_url: Optional[str] = None
    zoom_link: Optional[str] = None
    lesson_date: Optional[str] = None
    order: int
    created_at: str
    resources: List[dict] = []

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lesson_id: str
    user_id: str
    user_name: str
    content: str
    is_hidden: bool = False
    created_at: str

class ChatMessageCreate(BaseModel):
    content: str

class ChatMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    content: str
    is_hidden: bool = False
    created_at: str

class PrivateMessageCreate(BaseModel):
    teacher_id: str
    content: str

class PrivateMessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_name: str
    teacher_id: str
    teacher_name: str
    content: str
    is_read: bool = False
    created_at: str

class ResourceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lesson_id: str
    filename: str
    original_filename: str
    file_type: str
    file_size: int
    uploaded_by: str
    created_at: str

class AttendanceCreate(BaseModel):
    lesson_id: str
    action: str  # "joined_live" or "marked_attended"

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    lesson_id: str
    action: str
    created_at: str

class AnalyticsResponse(BaseModel):
    total_users: int
    approved_users: int
    pending_users: int
    total_courses: int
    total_lessons: int
    total_comments: int
    total_chat_messages: int
    attendance_records: int

class EnrollmentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    course_id: str
    enrolled_at: str
    progress: int = 0  # percentage of lessons completed

# ============== AUTH HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_approved(user: dict = Depends(get_current_user)):
    if not user.get('is_approved'):
        raise HTTPException(status_code=403, detail="Account pending approval")
    return user

async def require_teacher_or_admin(user: dict = Depends(require_approved)):
    if user['role'] not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="Teacher or Admin access required")
    return user

async def require_admin(user: dict = Depends(require_approved)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(data: UserCreate):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': data.email,
        'name': data.name,
        'password': hash_password(data.password),
        'role': 'member',
        'is_approved': False,
        'is_muted': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    return {'message': 'Registration successful. Please wait for admin approval.', 'user_id': user_id}

@api_router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'], user['role'])
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'is_approved': user['is_approved']
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        role=user['role'],
        is_approved=user['is_approved'],
        created_at=user['created_at']
    )

# ============== USER MANAGEMENT ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0, 'password': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/pending", response_model=List[UserResponse])
async def get_pending_users(user: dict = Depends(require_admin)):
    users = await db.users.find({'is_approved': False}, {'_id': 0, 'password': 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.put("/users/{user_id}/approve")
async def approve_user(user_id: str, user: dict = Depends(require_admin)):
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_approved': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': 'User approved'}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, role: str = Query(...), user: dict = Depends(require_admin)):
    if role not in ['member', 'teacher', 'admin']:
        raise HTTPException(status_code=400, detail="Invalid role")
    result = await db.users.update_one({'id': user_id}, {'$set': {'role': role}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'User role updated to {role}'}

@api_router.put("/users/{user_id}/mute")
async def mute_user(user_id: str, muted: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.users.update_one({'id': user_id}, {'$set': {'is_muted': muted}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': f'User {"muted" if muted else "unmuted"}'}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_admin)):
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {'message': 'User deleted'}

# ============== COURSES ==============

@api_router.post("/courses", response_model=CourseResponse)
async def create_course(data: CourseCreate, user: dict = Depends(require_teacher_or_admin)):
    course_id = str(uuid.uuid4())
    course = {
        'id': course_id,
        'title': data.title,
        'description': data.description,
        'zoom_link': data.zoom_link,
        'thumbnail_url': data.thumbnail_url,
        'teacher_id': user['id'],
        'teacher_name': user['name'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    return CourseResponse(**course, lesson_count=0, enrollment_count=0, is_enrolled=False)

@api_router.get("/courses", response_model=List[CourseResponse])
async def get_courses(user: dict = Depends(require_approved)):
    courses = await db.courses.find({}, {'_id': 0}).to_list(1000)
    result = []
    for c in courses:
        lesson_count = await db.lessons.count_documents({'course_id': c['id']})
        enrollment_count = await db.enrollments.count_documents({'course_id': c['id']})
        is_enrolled = await db.enrollments.find_one({'course_id': c['id'], 'user_id': user['id']}) is not None
        result.append(CourseResponse(**c, lesson_count=lesson_count, enrollment_count=enrollment_count, is_enrolled=is_enrolled))
    return result

@api_router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: str, user: dict = Depends(require_approved)):
    course = await db.courses.find_one({'id': course_id}, {'_id': 0})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    lesson_count = await db.lessons.count_documents({'course_id': course_id})
    enrollment_count = await db.enrollments.count_documents({'course_id': course_id})
    is_enrolled = await db.enrollments.find_one({'course_id': course_id, 'user_id': user['id']}) is not None
    return CourseResponse(**course, lesson_count=lesson_count, enrollment_count=enrollment_count, is_enrolled=is_enrolled)

@api_router.put("/courses/{course_id}")
async def update_course(course_id: str, data: CourseCreate, user: dict = Depends(require_teacher_or_admin)):
    result = await db.courses.update_one(
        {'id': course_id},
        {'$set': data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    return {'message': 'Course updated'}

@api_router.delete("/courses/{course_id}")
async def delete_course(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.courses.delete_one({'id': course_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Course not found")
    await db.lessons.delete_many({'course_id': course_id})
    await db.enrollments.delete_many({'course_id': course_id})
    return {'message': 'Course and associated lessons deleted'}

# ============== ENROLLMENTS ==============

@api_router.post("/courses/{course_id}/enroll", response_model=EnrollmentResponse)
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

@api_router.delete("/courses/{course_id}/enroll")
async def unenroll_from_course(course_id: str, user: dict = Depends(require_approved)):
    result = await db.enrollments.delete_one({'course_id': course_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    return {'message': 'Unenrolled from course'}

@api_router.get("/enrollments/my", response_model=List[EnrollmentResponse])
async def get_my_enrollments(user: dict = Depends(require_approved)):
    enrollments = await db.enrollments.find({'user_id': user['id']}, {'_id': 0}).to_list(1000)
    return [EnrollmentResponse(**e) for e in enrollments]

@api_router.get("/courses/{course_id}/enrollments", response_model=List[EnrollmentResponse])
async def get_course_enrollments(course_id: str, user: dict = Depends(require_teacher_or_admin)):
    enrollments = await db.enrollments.find({'course_id': course_id}, {'_id': 0}).to_list(1000)
    return [EnrollmentResponse(**e) for e in enrollments]

# ============== LESSONS ==============

@api_router.post("/lessons", response_model=LessonResponse)
async def create_lesson(data: LessonCreate, user: dict = Depends(require_teacher_or_admin)):
    course = await db.courses.find_one({'id': data.course_id})
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    lesson_id = str(uuid.uuid4())
    lesson = {
        'id': lesson_id,
        'course_id': data.course_id,
        'title': data.title,
        'description': data.description,
        'youtube_url': data.youtube_url,
        'zoom_link': data.zoom_link,
        'lesson_date': data.lesson_date,
        'order': data.order,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.lessons.insert_one(lesson)
    return LessonResponse(**lesson, resources=[])

@api_router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
async def get_course_lessons(course_id: str, user: dict = Depends(require_approved)):
    lessons = await db.lessons.find({'course_id': course_id}, {'_id': 0}).sort('order', 1).to_list(1000)
    result = []
    for lesson in lessons:
        resources = await db.resources.find({'lesson_id': lesson['id']}, {'_id': 0}).to_list(100)
        result.append(LessonResponse(**lesson, resources=resources))
    return result

@api_router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    resources = await db.resources.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(100)
    return LessonResponse(**lesson, resources=resources)

@api_router.get("/lessons/next/upcoming", response_model=Optional[LessonResponse])
async def get_next_lesson(user: dict = Depends(require_approved)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    lesson = await db.lessons.find_one(
        {'lesson_date': {'$gte': today}},
        {'_id': 0}
    )
    if lesson:
        resources = await db.resources.find({'lesson_id': lesson['id']}, {'_id': 0}).to_list(100)
        return LessonResponse(**lesson, resources=resources)
    # Fallback to most recent
    lesson = await db.lessons.find_one({}, {'_id': 0}, sort=[('created_at', -1)])
    if lesson:
        resources = await db.resources.find({'lesson_id': lesson['id']}, {'_id': 0}).to_list(100)
        return LessonResponse(**lesson, resources=resources)
    return None

@api_router.put("/lessons/{lesson_id}")
async def update_lesson(lesson_id: str, data: LessonBase, user: dict = Depends(require_teacher_or_admin)):
    result = await db.lessons.update_one(
        {'id': lesson_id},
        {'$set': data.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {'message': 'Lesson updated'}

@api_router.delete("/lessons/{lesson_id}")
async def delete_lesson(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.lessons.delete_one({'id': lesson_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    await db.comments.delete_many({'lesson_id': lesson_id})
    await db.resources.delete_many({'lesson_id': lesson_id})
    return {'message': 'Lesson deleted'}

# ============== DISCUSSION/COMMENTS ==============

@api_router.post("/lessons/{lesson_id}/comments", response_model=CommentResponse)
async def create_comment(lesson_id: str, data: CommentCreate, user: dict = Depends(require_approved)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot post")
    
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

@api_router.get("/lessons/{lesson_id}/comments", response_model=List[CommentResponse])
async def get_comments(lesson_id: str, user: dict = Depends(require_approved)):
    query = {'lesson_id': lesson_id}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    comments = await db.comments.find(query, {'_id': 0}).sort('created_at', 1).to_list(1000)
    return [CommentResponse(**c) for c in comments]

@api_router.put("/comments/{comment_id}/hide")
async def hide_comment(comment_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.update_one({'id': comment_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': f'Comment {"hidden" if hidden else "shown"}'}

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.comments.delete_one({'id': comment_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {'message': 'Comment deleted'}

# ============== GLOBAL CHAT ==============

@api_router.post("/chat", response_model=ChatMessageResponse)
async def send_chat_message(data: ChatMessageCreate, user: dict = Depends(require_approved)):
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot chat")
    
    message_id = str(uuid.uuid4())
    message = {
        'id': message_id,
        'user_id': user['id'],
        'user_name': user['name'],
        'content': data.content,
        'is_hidden': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.chat_messages.insert_one(message)
    return ChatMessageResponse(**message)

@api_router.get("/chat", response_model=List[ChatMessageResponse])
async def get_chat_messages(limit: int = 100, user: dict = Depends(require_approved)):
    query = {}
    if user['role'] not in ['teacher', 'admin']:
        query['is_hidden'] = False
    messages = await db.chat_messages.find(query, {'_id': 0}).sort('created_at', -1).limit(limit).to_list(limit)
    return [ChatMessageResponse(**m) for m in reversed(messages)]

@api_router.put("/chat/{message_id}/hide")
async def hide_chat_message(message_id: str, hidden: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.update_one({'id': message_id}, {'$set': {'is_hidden': hidden}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': f'Message {"hidden" if hidden else "shown"}'}

@api_router.delete("/chat/{message_id}")
async def delete_chat_message(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.chat_messages.delete_one({'id': message_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': 'Message deleted'}

# ============== PRIVATE MESSAGES (Member -> Teacher) ==============

@api_router.post("/messages", response_model=PrivateMessageResponse)
async def send_private_message(data: PrivateMessageCreate, user: dict = Depends(require_approved)):
    teacher = await db.users.find_one({'id': data.teacher_id, 'role': 'teacher'}, {'_id': 0})
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

@api_router.get("/messages/inbox", response_model=List[PrivateMessageResponse])
async def get_inbox(user: dict = Depends(require_approved)):
    if user['role'] == 'teacher':
        # Teachers see messages sent to them
        messages = await db.private_messages.find({'teacher_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    else:
        # Members see messages they sent
        messages = await db.private_messages.find({'sender_id': user['id']}, {'_id': 0}).sort('created_at', -1).to_list(1000)
    return [PrivateMessageResponse(**m) for m in messages]

@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.private_messages.update_one({'id': message_id}, {'$set': {'is_read': True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {'message': 'Marked as read'}

@api_router.get("/teachers", response_model=List[UserResponse])
async def get_teachers(user: dict = Depends(require_approved)):
    teachers = await db.users.find({'role': 'teacher', 'is_approved': True}, {'_id': 0, 'password': 0}).to_list(100)
    return [UserResponse(**t) for t in teachers]

# ============== FILE UPLOADS ==============

@api_router.post("/lessons/{lesson_id}/resources")
async def upload_resource(
    lesson_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Validate file type
    allowed_types = ['application/pdf', 'application/vnd.ms-powerpoint', 
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                     'image/jpeg', 'image/png', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed. Use PDF, PPT, PPTX, or images.")
    
    # Check file size
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB")
    
    # Save file
    resource_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix
    stored_filename = f"{resource_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Determine file type category
    if 'pdf' in file.content_type:
        file_type = 'pdf'
    elif 'powerpoint' in file.content_type or 'presentation' in file.content_type:
        file_type = 'ppt'
    else:
        file_type = 'image'
    
    resource = {
        'id': resource_id,
        'lesson_id': lesson_id,
        'filename': stored_filename,
        'original_filename': file.filename,
        'file_type': file_type,
        'file_size': len(content),
        'uploaded_by': user['id'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.resources.insert_one(resource)
    
    return ResourceResponse(**resource)

@api_router.get("/resources/{resource_id}/download")
async def download_resource(resource_id: str, user: dict = Depends(require_approved)):
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

@api_router.delete("/resources/{resource_id}")
async def delete_resource(resource_id: str, user: dict = Depends(require_teacher_or_admin)):
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    file_path = UPLOAD_DIR / resource['filename']
    if file_path.exists():
        file_path.unlink()
    
    await db.resources.delete_one({'id': resource_id})
    return {'message': 'Resource deleted'}

# ============== ATTENDANCE ==============

@api_router.post("/attendance", response_model=AttendanceResponse)
async def record_attendance(data: AttendanceCreate, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': data.lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
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
    return AttendanceResponse(**attendance)

@api_router.get("/attendance/lesson/{lesson_id}", response_model=List[AttendanceResponse])
async def get_lesson_attendance(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    records = await db.attendance.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(1000)
    return [AttendanceResponse(**r) for r in records]

# ============== ANALYTICS ==============

@api_router.get("/analytics", response_model=AnalyticsResponse)
async def get_analytics(user: dict = Depends(require_admin)):
    total_users = await db.users.count_documents({})
    approved_users = await db.users.count_documents({'is_approved': True})
    pending_users = await db.users.count_documents({'is_approved': False})
    total_courses = await db.courses.count_documents({})
    total_lessons = await db.lessons.count_documents({})
    total_comments = await db.comments.count_documents({})
    total_chat = await db.chat_messages.count_documents({})
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

@api_router.get("/analytics/participation")
async def get_participation_stats(user: dict = Depends(require_admin)):
    # Get top participants by comments
    pipeline = [
        {'$group': {'_id': '$user_id', 'user_name': {'$first': '$user_name'}, 'count': {'$sum': 1}}},
        {'$sort': {'count': -1}},
        {'$limit': 10}
    ]
    top_commenters = await db.comments.aggregate(pipeline).to_list(10)
    
    # Get top chatters
    top_chatters = await db.chat_messages.aggregate(pipeline).to_list(10)
    
    return {
        'top_commenters': [{'user_id': t['_id'], 'user_name': t['user_name'], 'count': t['count']} for t in top_commenters],
        'top_chatters': [{'user_id': t['_id'], 'user_name': t['user_name'], 'count': t['count']} for t in top_chatters]
    }

# ============== SEED DATA ==============

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing_admin = await db.users.find_one({'email': 'admin@sundayschool.com'})
    if existing_admin:
        return {'message': 'Data already seeded'}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    admin = {
        'id': admin_id,
        'email': 'admin@sundayschool.com',
        'name': 'Admin User',
        'password': hash_password('admin123'),
        'role': 'admin',
        'is_approved': True,
        'is_muted': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    # Create teacher user
    teacher_id = str(uuid.uuid4())
    teacher = {
        'id': teacher_id,
        'email': 'teacher@sundayschool.com',
        'name': 'Sarah Johnson',
        'password': hash_password('teacher123'),
        'role': 'teacher',
        'is_approved': True,
        'is_muted': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(teacher)
    
    # Create member user
    member_id = str(uuid.uuid4())
    member = {
        'id': member_id,
        'email': 'member@sundayschool.com',
        'name': 'John Smith',
        'password': hash_password('member123'),
        'role': 'member',
        'is_approved': True,
        'is_muted': False,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(member)
    
    # Create sample course
    course_id = str(uuid.uuid4())
    course = {
        'id': course_id,
        'title': 'Introduction to the Gospel',
        'description': 'A foundational course exploring the core teachings of the Gospel, perfect for new believers and those seeking to deepen their understanding.',
        'zoom_link': 'https://zoom.us/j/1234567890',
        'thumbnail_url': 'https://images.unsplash.com/photo-1610070835951-156b6921281d?w=800',
        'teacher_id': teacher_id,
        'teacher_name': 'Sarah Johnson',
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.courses.insert_one(course)
    
    # Create sample lessons
    lessons_data = [
        {
            'title': 'The Good News',
            'description': 'Understanding the meaning and significance of the Gospel message.',
            'youtube_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'lesson_date': '2026-01-12',
            'order': 1
        },
        {
            'title': 'Faith and Grace',
            'description': 'Exploring the relationship between faith and grace in salvation.',
            'youtube_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'lesson_date': '2026-01-19',
            'order': 2
        },
        {
            'title': 'Living in Christ',
            'description': 'Practical guidance for daily living as followers of Christ.',
            'youtube_url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'lesson_date': '2026-01-26',
            'order': 3
        }
    ]
    
    for lesson_data in lessons_data:
        lesson_id = str(uuid.uuid4())
        lesson = {
            'id': lesson_id,
            'course_id': course_id,
            **lesson_data,
            'zoom_link': None,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.lessons.insert_one(lesson)
        
        # Add sample comments
        comment = {
            'id': str(uuid.uuid4()),
            'lesson_id': lesson_id,
            'user_id': member_id,
            'user_name': 'John Smith',
            'content': f'Great lesson on {lesson_data["title"]}! Really helped me understand better.',
            'is_hidden': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.comments.insert_one(comment)
    
    # Add sample chat messages
    chat_messages = [
        {'user_id': member_id, 'user_name': 'John Smith', 'content': 'Good morning everyone!'},
        {'user_id': teacher_id, 'user_name': 'Sarah Johnson', 'content': 'Welcome to Sunday School chat! Feel free to ask questions.'},
    ]
    for msg in chat_messages:
        await db.chat_messages.insert_one({
            'id': str(uuid.uuid4()),
            **msg,
            'is_hidden': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    return {
        'message': 'Seed data created',
        'credentials': {
            'admin': {'email': 'admin@sundayschool.com', 'password': 'admin123'},
            'teacher': {'email': 'teacher@sundayschool.com', 'password': 'teacher123'},
            'member': {'email': 'member@sundayschool.com', 'password': 'member123'}
        }
    }

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "Sunday School Education API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

# Static files for uploads
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
