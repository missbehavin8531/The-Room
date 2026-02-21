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
import httpx
import time

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

# Daily.co Configuration
DAILY_API_KEY = os.environ.get('DAILY_API_KEY', '')
DAILY_DOMAIN = os.environ.get('DAILY_DOMAIN', '')

# Create the main app
app = FastAPI(title="The Room API")

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
    thumbnail_url: Optional[str] = None
    is_published: bool = False  # Draft vs Published

class CourseCreate(CourseBase):
    pass

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    thumbnail_url: Optional[str] = None
    is_published: bool = False
    teacher_id: str
    teacher_name: str
    created_at: str
    lesson_count: int = 0
    enrollment_count: int = 0
    is_enrolled: bool = False
    completed_lessons: int = 0  # For progress tracking
    total_lessons: int = 0

class LessonBase(BaseModel):
    title: str
    description: str
    lesson_date: Optional[str] = None
    teacher_notes: Optional[str] = None
    reading_plan: Optional[str] = None
    # Hosting: single choice only
    hosting_method: str = "in_app"  # "in_app" or "zoom"
    zoom_link: Optional[str] = None
    # Recording source options
    recording_source: str = "none"  # "none", "daily", "youtube", "external"
    recording_url: Optional[str] = None  # YouTube or external URL
    # Publishing
    is_published: bool = False
    order: int = 0

class LessonCreate(LessonBase):
    course_id: str

class LessonResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    course_id: str
    title: str
    description: str
    lesson_date: Optional[str] = None
    teacher_notes: Optional[str] = None
    reading_plan: Optional[str] = None
    hosting_method: str = "in_app"
    zoom_link: Optional[str] = None
    recording_source: str = "none"
    recording_url: Optional[str] = None
    is_published: bool = False
    order: int
    created_at: str
    resources: List[dict] = []
    prompts: List[dict] = []
    user_attendance: List[str] = []
    is_completed: bool = False  # Has current user completed this lesson
    is_unlocked: bool = True  # Is lesson accessible (sequential unlock)
    youtube_url: Optional[str] = None  # Backward compatibility

# ============== TEACHER PROMPTS ==============

class TeacherPromptCreate(BaseModel):
    question: str
    order: int = 0

class TeacherPromptResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lesson_id: str
    question: str
    order: int
    created_at: str

class PromptReplyCreate(BaseModel):
    content: str

class PromptReplyResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    prompt_id: str
    lesson_id: str
    user_id: str
    user_name: str
    content: str
    is_pinned: bool = False
    status: str = "pending"  # pending, answered, needs_followup
    created_at: str

# ============== COMMENTS ==============

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
    is_primary: bool = False
    order: int = 0
    created_at: str

class AttendanceCreate(BaseModel):
    lesson_id: str
    action: str  # "joined_live", "watched_replay", "viewed_slides", "marked_attended"

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    lesson_id: str
    action: str
    created_at: str

class PromptResponseCreate(BaseModel):
    content: str

class PromptResponseModel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    lesson_id: str
    user_id: str
    user_name: str
    content: str
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

# ============== VIDEO ROOM MODELS ==============

class VideoRoomResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    room_name: str
    room_url: str
    meeting_token: str
    lesson_id: str

class VideoRoomStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    room_exists: bool
    room_name: Optional[str] = None
    room_url: Optional[str] = None
    participants_count: int = 0

class RecordingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    room_name: str
    start_ts: Optional[int] = None
    duration: Optional[int] = None
    max_participants: Optional[int] = None
    download_url: Optional[str] = None
    status: str = "unknown"

class LessonRecordingsResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lesson_id: str
    recordings: List[RecordingResponse] = []
    has_recordings: bool = False

class RecordingControlResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    success: bool
    message: str
    recording_id: Optional[str] = None
    is_recording: bool = False

# ============== DAILY.CO SERVICE ==============

class DailyService:
    """Service for interacting with Daily.co API"""
    
    BASE_URL = "https://api.daily.co/v1"
    
    def __init__(self):
        self.api_key = DAILY_API_KEY
        self.domain = DAILY_DOMAIN
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def get_or_create_room(self, room_name: str) -> dict:
        """Get existing room or create new one with cloud recording enabled"""
        async with httpx.AsyncClient() as client:
            # Try to get existing room
            try:
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
            except Exception:
                pass
            
            # Room doesn't exist, create it with cloud recording enabled
            exp_time = int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp())
            payload = {
                "name": room_name,
                "privacy": "public",
                "properties": {
                    "exp": exp_time,
                    "enable_chat": True,
                    "enable_screenshare": True,
                    "start_video_off": False,
                    "start_audio_off": False,
                    "enable_knocking": False,
                    "max_participants": 100,
                    "enable_recording": "cloud"  # Enable cloud recording
                }
            }
            
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms",
                    json=payload,
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                logging.error(f"Failed to create room: {e}")
                raise Exception(f"Failed to create video room: {str(e)}")
    
    async def get_room_status(self, room_name: str) -> dict:
        """Get room status and participant count"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    room_data = response.json()
                    # Get active session info
                    presence_response = await client.get(
                        f"{self.BASE_URL}/rooms/{room_name}/presence",
                        headers=self.headers,
                        timeout=10.0
                    )
                    participants = 0
                    if presence_response.status_code == 200:
                        presence_data = presence_response.json()
                        participants = len(presence_data.get('data', []))
                    return {
                        "exists": True,
                        "room": room_data,
                        "participants": participants
                    }
            except Exception:
                pass
            return {"exists": False, "room": None, "participants": 0}
    
    async def get_recordings(self, room_name: str) -> list:
        """Get cloud recordings for a room"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/recordings",
                    params={"room_name": room_name, "limit": 10},
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code == 200:
                    data = response.json()
                    return data.get('data', [])
            except Exception as e:
                logging.error(f"Failed to fetch recordings: {e}")
            return []
    
    async def get_recording_access_link(self, recording_id: str) -> dict:
        """Get access link for a specific recording"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.BASE_URL}/recordings/{recording_id}/access-link",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
            except Exception as e:
                logging.error(f"Failed to get recording access link: {e}")
            return None
    
    async def start_recording(self, room_name: str) -> dict:
        """Start cloud recording for a room"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms/{room_name}/recordings",
                    json={"type": "cloud"},
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    error_msg = response.text
                    logging.error(f"Failed to start recording: {error_msg}")
                    return {"error": error_msg, "status_code": response.status_code}
            except Exception as e:
                logging.error(f"Failed to start recording: {e}")
                return {"error": str(e)}
    
    async def stop_recording(self, room_name: str, recording_id: str) -> dict:
        """Stop an active recording"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.BASE_URL}/rooms/{room_name}/recordings/{recording_id}/stop",
                    headers=self.headers,
                    timeout=15.0
                )
                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    error_msg = response.text
                    logging.error(f"Failed to stop recording: {error_msg}")
                    return {"error": error_msg, "status_code": response.status_code}
            except Exception as e:
                logging.error(f"Failed to stop recording: {e}")
                return {"error": str(e)}
    
    async def get_active_recording(self, room_name: str) -> dict:
        """Check if there's an active recording in the room"""
        async with httpx.AsyncClient() as client:
            try:
                # Get room info to check for active recording
                response = await client.get(
                    f"{self.BASE_URL}/rooms/{room_name}",
                    headers=self.headers,
                    timeout=10.0
                )
                if response.status_code == 200:
                    # Check recent recordings for any that are currently active
                    recordings = await self.get_recordings(room_name)
                    # Find any recording that's currently active (no end timestamp)
                    for rec in recordings:
                        if rec.get('status') == 'processing' or rec.get('status') == 'started':
                            return {"is_recording": True, "recording_id": rec.get('id')}
                    return {"is_recording": False, "recording_id": None}
            except Exception as e:
                logging.error(f"Failed to check active recording: {e}")
            return {"is_recording": False, "recording_id": None}
    
    def create_meeting_token(self, room_name: str, user_id: str, user_name: str, is_owner: bool = False) -> str:
        """Create a Daily.co meeting token"""
        domain_id = self.domain.replace(".daily.co", "")
        payload = {
            "r": room_name,
            "d": domain_id,
            "ud": user_id,
            "u": user_name,
            "o": is_owner,
            "ss": True,  # enable screenshare
            "iat": int(time.time()),
            "exp": int(time.time()) + 7200  # 2 hour expiration
        }
        return jwt.encode(payload, self.api_key, algorithm="HS256")

daily_service = DailyService()

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

async def require_teacher(user: dict = Depends(require_approved)):
    """Teachers have full admin capabilities - consolidated role"""
    if user['role'] not in ['teacher', 'admin']:
        raise HTTPException(status_code=403, detail="Teacher access required")
    return user

# Alias for backward compatibility
require_teacher_or_admin = require_teacher
require_admin = require_teacher

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
    
    # Get next order number
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

async def get_lesson_with_details(lesson: dict, user_id: str, user_role: str = 'member'):
    """Helper to get lesson with all related data including unlock status"""
    resources = await db.resources.find({'lesson_id': lesson['id']}, {'_id': 0}).sort('order', 1).to_list(100)
    prompts = await db.teacher_prompts.find({'lesson_id': lesson['id']}, {'_id': 0}).sort('order', 1).to_list(10)
    attendance_records = await db.attendance.find({'lesson_id': lesson['id'], 'user_id': user_id}, {'_id': 0}).to_list(100)
    user_attendance = list(set([r['action'] for r in attendance_records]))
    
    # Check if lesson is completed by user
    completion = await db.lesson_completions.find_one({'lesson_id': lesson['id'], 'user_id': user_id})
    is_completed = completion is not None
    
    # Check if lesson is unlocked (sequential logic)
    is_unlocked = True
    if user_role not in ['teacher', 'admin']:
        # Get previous lesson in order
        prev_lesson = await db.lessons.find_one(
            {'course_id': lesson['course_id'], 'order': {'$lt': lesson.get('order', 0)}, 'is_published': True},
            sort=[('order', -1)]
        )
        if prev_lesson:
            # Check if previous lesson is completed
            prev_completion = await db.lesson_completions.find_one({
                'lesson_id': prev_lesson['id'],
                'user_id': user_id
            })
            is_unlocked = prev_completion is not None
        # First lesson is always unlocked
        if lesson.get('order', 1) == 1:
            is_unlocked = True
    
    # Backward compatibility: map recording_url to youtube_url if needed
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

@api_router.get("/courses/{course_id}/lessons", response_model=List[LessonResponse])
async def get_course_lessons(course_id: str, user: dict = Depends(require_approved)):
    # Teachers see all lessons, members only see published ones
    query = {'course_id': course_id}
    if user['role'] not in ['teacher', 'admin']:
        query['is_published'] = True
    
    lessons = await db.lessons.find(query, {'_id': 0}).sort('order', 1).to_list(1000)
    result = []
    for lesson in lessons:
        lesson_data = await get_lesson_with_details(lesson, user['id'], user['role'])
        result.append(lesson_data)
    return result

@api_router.get("/lessons/all", response_model=List[LessonResponse])
async def get_all_lessons(user: dict = Depends(require_approved)):
    """Get all lessons across all courses (for calendar view)"""
    query = {}
    if user['role'] not in ['teacher', 'admin']:
        query['is_published'] = True
    
    lessons = await db.lessons.find(query, {'_id': 0}).sort('lesson_date', 1).to_list(1000)
    result = []
    for lesson in lessons:
        lesson_data = await get_lesson_with_details(lesson, user['id'], user['role'])
        result.append(lesson_data)
    return result

@api_router.get("/lessons/{lesson_id}", response_model=LessonResponse)
async def get_lesson(lesson_id: str, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Check access for members
    if user['role'] not in ['teacher', 'admin']:
        if not lesson.get('is_published', False):
            raise HTTPException(status_code=404, detail="Lesson not found")
    
    return await get_lesson_with_details(lesson, user['id'], user['role'])

@api_router.get("/lessons/next/upcoming", response_model=Optional[LessonResponse])
async def get_next_lesson(user: dict = Depends(require_approved)):
    today = datetime.now(timezone.utc).isoformat()[:10]
    query = {'lesson_date': {'$gte': today}, 'is_published': True}
    lesson = await db.lessons.find_one(query, {'_id': 0})
    if lesson:
        return await get_lesson_with_details(lesson, user['id'], user['role'])
    # Fallback to most recent published
    lesson = await db.lessons.find_one({'is_published': True}, {'_id': 0}, sort=[('created_at', -1)])
    if lesson:
        return await get_lesson_with_details(lesson, user['id'], user['role'])
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
    
    # Check if already recorded this action
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
    return AttendanceResponse(**attendance)

@api_router.get("/attendance/lesson/{lesson_id}", response_model=List[AttendanceResponse])
async def get_lesson_attendance(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    records = await db.attendance.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(1000)
    return [AttendanceResponse(**r) for r in records]

@api_router.get("/attendance/lesson/{lesson_id}/summary")
async def get_lesson_attendance_summary(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    """Get attendance summary with unique users per action"""
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

@api_router.get("/attendance/my/{lesson_id}")
async def get_my_attendance(lesson_id: str, user: dict = Depends(require_approved)):
    """Get current user's attendance actions for a lesson"""
    records = await db.attendance.find({'lesson_id': lesson_id, 'user_id': user['id']}, {'_id': 0}).to_list(100)
    actions = list(set([r['action'] for r in records]))
    return {'actions': actions}

# ============== VIDEO ROOMS (Daily.co) ==============

@api_router.post("/lessons/{lesson_id}/video/join", response_model=VideoRoomResponse)
async def join_lesson_video_room(lesson_id: str, user: dict = Depends(require_approved)):
    """Join or create a video room for a lesson"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Create a unique room name based on lesson ID
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        # Get or create the room
        room_data = await daily_service.get_or_create_room(room_name)
        
        # Determine if user is owner (teacher/admin)
        is_owner = user['role'] in ['teacher', 'admin']
        
        # Generate meeting token
        meeting_token = daily_service.create_meeting_token(
            room_name=room_name,
            user_id=user['id'],
            user_name=user['name'],
            is_owner=is_owner
        )
        
        # Record attendance
        existing = await db.attendance.find_one({
            'lesson_id': lesson_id,
            'user_id': user['id'],
            'action': 'joined_video'
        })
        if not existing:
            await db.attendance.insert_one({
                'id': str(uuid.uuid4()),
                'user_id': user['id'],
                'user_name': user['name'],
                'lesson_id': lesson_id,
                'action': 'joined_video',
                'created_at': datetime.now(timezone.utc).isoformat()
            })
        
        return VideoRoomResponse(
            room_name=room_name,
            room_url=room_data.get('url', f"https://{DAILY_DOMAIN}/{room_name}"),
            meeting_token=meeting_token,
            lesson_id=lesson_id
        )
    except Exception as e:
        logging.error(f"Failed to join video room: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to join video room: {str(e)}")

@api_router.get("/lessons/{lesson_id}/video/status", response_model=VideoRoomStatus)
async def get_lesson_video_status(lesson_id: str, user: dict = Depends(require_approved)):
    """Get the status of a lesson's video room"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        status = await daily_service.get_room_status(room_name)
        if status['exists']:
            return VideoRoomStatus(
                room_exists=True,
                room_name=room_name,
                room_url=status['room'].get('url'),
                participants_count=status['participants']
            )
        return VideoRoomStatus(room_exists=False)
    except Exception as e:
        logging.error(f"Failed to get room status: {e}")
        return VideoRoomStatus(room_exists=False)

@api_router.get("/lessons/{lesson_id}/recordings", response_model=LessonRecordingsResponse)
async def get_lesson_recordings(lesson_id: str, user: dict = Depends(require_approved)):
    """Get all cloud recordings for a lesson"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        raw_recordings = await daily_service.get_recordings(room_name)
        recordings = []
        
        for rec in raw_recordings:
            # Get access link for each recording
            access_link = await daily_service.get_recording_access_link(rec.get('id', ''))
            download_url = None
            if access_link:
                download_url = access_link.get('download_link') or access_link.get('link')
            
            recordings.append(RecordingResponse(
                id=rec.get('id', ''),
                room_name=rec.get('room_name', room_name),
                start_ts=rec.get('start_ts'),
                duration=rec.get('duration'),
                max_participants=rec.get('max_participants'),
                download_url=download_url,
                status=rec.get('status', 'unknown')
            ))
        
        return LessonRecordingsResponse(
            lesson_id=lesson_id,
            recordings=recordings,
            has_recordings=len(recordings) > 0
        )
    except Exception as e:
        logging.error(f"Failed to fetch recordings: {e}")
        return LessonRecordingsResponse(
            lesson_id=lesson_id,
            recordings=[],
            has_recordings=False
        )

@api_router.post("/lessons/{lesson_id}/recording/start", response_model=RecordingControlResponse)
async def start_lesson_recording(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    """Start recording a lesson's video room (teacher/admin only)"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        # Check if already recording
        active = await daily_service.get_active_recording(room_name)
        if active.get('is_recording'):
            return RecordingControlResponse(
                success=False,
                message="Recording is already in progress",
                recording_id=active.get('recording_id'),
                is_recording=True
            )
        
        # Start recording
        result = await daily_service.start_recording(room_name)
        
        if result.get('error'):
            return RecordingControlResponse(
                success=False,
                message=f"Failed to start recording: {result.get('error')}",
                is_recording=False
            )
        
        return RecordingControlResponse(
            success=True,
            message="Recording started successfully",
            recording_id=result.get('id'),
            is_recording=True
        )
    except Exception as e:
        logging.error(f"Failed to start recording: {e}")
        return RecordingControlResponse(
            success=False,
            message=f"Error: {str(e)}",
            is_recording=False
        )

@api_router.post("/lessons/{lesson_id}/recording/stop", response_model=RecordingControlResponse)
async def stop_lesson_recording(lesson_id: str, recording_id: str = Query(...), user: dict = Depends(require_teacher_or_admin)):
    """Stop recording a lesson's video room (teacher/admin only)"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        result = await daily_service.stop_recording(room_name, recording_id)
        
        if result.get('error'):
            return RecordingControlResponse(
                success=False,
                message=f"Failed to stop recording: {result.get('error')}",
                is_recording=True
            )
        
        return RecordingControlResponse(
            success=True,
            message="Recording stopped successfully",
            recording_id=recording_id,
            is_recording=False
        )
    except Exception as e:
        logging.error(f"Failed to stop recording: {e}")
        return RecordingControlResponse(
            success=False,
            message=f"Error: {str(e)}",
            is_recording=True
        )

@api_router.get("/lessons/{lesson_id}/recording/status")
async def get_lesson_recording_status(lesson_id: str, user: dict = Depends(require_approved)):
    """Get the recording status of a lesson's video room"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    room_name = f"lesson-{lesson_id[:8]}"
    
    try:
        active = await daily_service.get_active_recording(room_name)
        return {
            "lesson_id": lesson_id,
            "is_recording": active.get('is_recording', False),
            "recording_id": active.get('recording_id')
        }
    except Exception as e:
        logging.error(f"Failed to get recording status: {e}")
        return {
            "lesson_id": lesson_id,
            "is_recording": False,
            "recording_id": None
        }

# ============== TEACHER PROMPTS ==============

@api_router.post("/lessons/{lesson_id}/prompts", response_model=TeacherPromptResponse)
async def create_teacher_prompt(lesson_id: str, data: TeacherPromptCreate, user: dict = Depends(require_teacher_or_admin)):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Check max 3 prompts
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

@api_router.get("/lessons/{lesson_id}/prompts", response_model=List[TeacherPromptResponse])
async def get_lesson_prompts(lesson_id: str, user: dict = Depends(require_approved)):
    prompts = await db.teacher_prompts.find({'lesson_id': lesson_id}, {'_id': 0}).sort('order', 1).to_list(10)
    return [TeacherPromptResponse(**p) for p in prompts]

@api_router.delete("/prompts/{prompt_id}")
async def delete_teacher_prompt(prompt_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.teacher_prompts.delete_one({'id': prompt_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    # Also delete replies
    await db.prompt_replies.delete_many({'prompt_id': prompt_id})
    return {'message': 'Prompt deleted'}

# ============== PROMPT REPLIES ==============

@api_router.post("/prompts/{prompt_id}/reply", response_model=PromptReplyResponse)
async def reply_to_prompt(prompt_id: str, data: PromptReplyCreate, user: dict = Depends(require_approved)):
    prompt = await db.teacher_prompts.find_one({'id': prompt_id})
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    
    if user.get('is_muted'):
        raise HTTPException(status_code=403, detail="You are muted and cannot respond")
    
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
    return PromptReplyResponse(**reply)

@api_router.get("/prompts/{prompt_id}/replies", response_model=List[PromptReplyResponse])
async def get_prompt_replies(prompt_id: str, user: dict = Depends(require_approved)):
    replies = await db.prompt_replies.find({'prompt_id': prompt_id}, {'_id': 0}).sort('created_at', 1).to_list(1000)
    # Sort pinned first
    replies.sort(key=lambda x: (not x.get('is_pinned', False), x['created_at']))
    return [PromptReplyResponse(**r) for r in replies]

@api_router.put("/replies/{reply_id}/pin")
async def pin_reply(reply_id: str, pinned: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.prompt_replies.update_one({'id': reply_id}, {'$set': {'is_pinned': pinned}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': f'Reply {"pinned" if pinned else "unpinned"}'}

@api_router.put("/replies/{reply_id}/status")
async def update_reply_status(reply_id: str, status: str = Query(...), user: dict = Depends(require_teacher_or_admin)):
    if status not in ['pending', 'answered', 'needs_followup']:
        raise HTTPException(status_code=400, detail="Invalid status")
    result = await db.prompt_replies.update_one({'id': reply_id}, {'$set': {'status': status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': f'Status updated to {status}'}

@api_router.delete("/replies/{reply_id}")
async def delete_reply(reply_id: str, user: dict = Depends(require_teacher_or_admin)):
    result = await db.prompt_replies.delete_one({'id': reply_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reply not found")
    return {'message': 'Reply deleted'}

@api_router.get("/lessons/{lesson_id}/all-replies")
async def get_all_lesson_replies(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    """Get all replies for a lesson grouped by prompt (teacher view)"""
    lesson = await db.lessons.find_one({'id': lesson_id}, {'_id': 0})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    prompts = await db.teacher_prompts.find({'lesson_id': lesson_id}, {'_id': 0}).sort('order', 1).to_list(10)
    
    result = []
    for prompt in prompts:
        replies = await db.prompt_replies.find({'prompt_id': prompt['id']}, {'_id': 0}).sort('created_at', 1).to_list(1000)
        # Sort pinned first
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

@api_router.put("/prompts/{prompt_id}")
async def update_prompt(prompt_id: str, data: TeacherPromptCreate, user: dict = Depends(require_teacher_or_admin)):
    """Update a prompt question"""
    result = await db.teacher_prompts.update_one(
        {'id': prompt_id},
        {'$set': {'question': data.question, 'order': data.order}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return {'message': 'Prompt updated'}

# ============== RESOURCE MANAGEMENT ==============

@api_router.put("/resources/{resource_id}/primary")
async def set_primary_resource(resource_id: str, user: dict = Depends(require_teacher_or_admin)):
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Unset other primaries for this lesson
    await db.resources.update_many(
        {'lesson_id': resource['lesson_id']},
        {'$set': {'is_primary': False}}
    )
    # Set this one as primary
    await db.resources.update_one({'id': resource_id}, {'$set': {'is_primary': True}})
    return {'message': 'Resource set as primary'}

@api_router.put("/resources/{resource_id}/order")
async def update_resource_order(resource_id: str, order: int = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.resources.update_one({'id': resource_id}, {'$set': {'order': order}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    return {'message': 'Order updated'}

@api_router.put("/resources/{resource_id}/replace")
async def replace_resource(
    resource_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(require_teacher_or_admin)
):
    """Replace an existing resource file (keeps same ID and metadata)"""
    resource = await db.resources.find_one({'id': resource_id}, {'_id': 0})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    # Validate file type
    allowed_types = ['application/pdf', 'application/vnd.ms-powerpoint', 
                     'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                     'image/jpeg', 'image/png', 'image/gif']
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="File type not allowed")
    
    content = await file.read()
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(status_code=400, detail=f"File too large. Max {MAX_UPLOAD_SIZE // (1024*1024)}MB")
    
    # Delete old file
    old_path = UPLOAD_DIR / resource['filename']
    if old_path.exists():
        old_path.unlink()
    
    # Save new file
    file_ext = Path(file.filename).suffix
    stored_filename = f"{resource_id}{file_ext}"
    file_path = UPLOAD_DIR / stored_filename
    with open(file_path, 'wb') as f:
        f.write(content)
    
    # Update metadata
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

# ============== DISCUSSION LOCK ==============

@api_router.put("/lessons/{lesson_id}/lock")
async def lock_lesson_discussion(lesson_id: str, locked: bool = Query(...), user: dict = Depends(require_teacher_or_admin)):
    result = await db.lessons.update_one({'id': lesson_id}, {'$set': {'discussion_locked': locked}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Lesson not found")
    return {'message': f'Discussion {"locked" if locked else "unlocked"}'}

# ============== OLD PROMPT RESPONSES (backwards compat) ==============

@api_router.post("/lessons/{lesson_id}/respond", response_model=PromptResponseModel)
async def respond_to_prompt(lesson_id: str, data: PromptResponseCreate, user: dict = Depends(require_approved)):
    lesson = await db.lessons.find_one({'id': lesson_id})
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")
    
    # Check if user already responded
    existing = await db.prompt_responses.find_one({'lesson_id': lesson_id, 'user_id': user['id']})
    if existing:
        # Update existing response
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

@api_router.get("/lessons/{lesson_id}/responses", response_model=List[PromptResponseModel])
async def get_prompt_responses(lesson_id: str, user: dict = Depends(require_teacher_or_admin)):
    """Get all prompt responses for a lesson (teacher/admin only)"""
    responses = await db.prompt_responses.find({'lesson_id': lesson_id}, {'_id': 0}).to_list(1000)
    return [PromptResponseModel(**r) for r in responses]

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
    # Check if already seeded (check both old and new email domains)
    existing_admin = await db.users.find_one({'$or': [
        {'email': 'admin@theroom.com'},
        {'email': 'admin@sundayschool.com'}
    ]})
    if existing_admin:
        return {'message': 'Data already seeded'}
    
    # Create admin user
    admin_id = str(uuid.uuid4())
    admin = {
        'id': admin_id,
        'email': 'admin@theroom.com',
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
        'email': 'teacher@theroom.com',
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
        'email': 'member@theroom.com',
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
    
    # Create sample lessons with full lesson-centric data
    lessons_data = [
        {
            'title': 'The Good News',
            'description': 'Understanding the meaning and significance of the Gospel message.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-09',
            'order': 1,
            'teacher_notes': '**Key Points to Remember:**\n\n1. The Gospel is the "good news" of salvation through Jesus Christ\n2. It\'s not about what we do, but what God has done for us\n3. The message is for everyone, regardless of background\n\n*"For God so loved the world that he gave his one and only Son" - John 3:16*',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: John 3:1-21\n- Tuesday: Romans 1:16-17\n- Wednesday: 1 Corinthians 15:1-11\n- Thursday: Ephesians 2:1-10\n- Friday: Psalm 96',
            'prompts': [
                {'question': 'What does the Gospel mean to you personally?', 'order': 0},
                {'question': 'Share one way the good news has impacted your life.', 'order': 1},
            ]
        },
        {
            'title': 'Faith and Grace',
            'description': 'Exploring the relationship between faith and grace in salvation.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-16',
            'order': 2,
            'teacher_notes': '**Understanding Grace:**\n\nGrace is unmerited favor - a gift we cannot earn.\n\n**Key Scriptures:**\n- Ephesians 2:8-9 - Saved by grace through faith\n- Romans 5:1-2 - Access to grace through faith\n\n**Discussion Focus:** Help members understand the balance between faith and works.',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: Ephesians 2:1-10\n- Tuesday: Romans 3:21-31\n- Wednesday: Galatians 2:15-21\n- Thursday: Hebrews 11:1-6\n- Friday: James 2:14-26',
            'prompts': [
                {'question': 'How do you experience God\'s grace in your daily life?', 'order': 0},
                {'question': 'Give a specific example of grace you\'ve witnessed recently.', 'order': 1},
            ]
        },
        {
            'title': 'Living in Christ',
            'description': 'Practical guidance for daily living as followers of Christ.',
            'youtube_url': 'https://www.youtube.com/watch?v=cgn6bjRo1Lg',
            'lesson_date': '2026-02-23',
            'order': 3,
            'teacher_notes': '**Living It Out:**\n\nFaith is not just belief - it transforms how we live.\n\n**Practical Applications:**\n1. Daily prayer and Scripture reading\n2. Serving others in our community\n3. Speaking truth with love\n4. Forgiving as we have been forgiven\n\n*"Whatever you do, work at it with all your heart, as working for the Lord" - Colossians 3:23*',
            'reading_plan': '**This Week\'s Reading:**\n\n- Monday: Colossians 3:1-17\n- Tuesday: Romans 12:1-8\n- Wednesday: Galatians 5:16-26\n- Thursday: Philippians 4:4-9\n- Friday: 1 Peter 2:9-12',
            'prompts': [
                {'question': 'What is one practical way you can live out your faith this week?', 'order': 0},
                {'question': 'Who in your life could benefit from seeing Christ in you?', 'order': 1},
            ]
        }
    ]
    
    for lesson_data in lessons_data:
        lesson_id = str(uuid.uuid4())
        prompts_data = lesson_data.pop('prompts', [])
        
        lesson = {
            'id': lesson_id,
            'course_id': course_id,
            'title': lesson_data['title'],
            'description': lesson_data['description'],
            'youtube_url': lesson_data['youtube_url'],
            'lesson_date': lesson_data['lesson_date'],
            'order': lesson_data['order'],
            'teacher_notes': lesson_data.get('teacher_notes'),
            'reading_plan': lesson_data.get('reading_plan'),
            'zoom_link': 'https://zoom.us/j/1234567890' if lesson_data['order'] == 1 else None,
            'hosting_method': 'both',  # Default to both options
            'discussion_locked': False,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
        await db.lessons.insert_one(lesson)
        
        # Add teacher prompts for this lesson
        for prompt_data in prompts_data:
            prompt_id = str(uuid.uuid4())
            prompt = {
                'id': prompt_id,
                'lesson_id': lesson_id,
                'question': prompt_data['question'],
                'order': prompt_data['order'],
                'created_at': datetime.now(timezone.utc).isoformat()
            }
            await db.teacher_prompts.insert_one(prompt)
            
            # Add a sample reply from the member
            if prompt_data['order'] == 0:
                reply = {
                    'id': str(uuid.uuid4()),
                    'prompt_id': prompt_id,
                    'lesson_id': lesson_id,
                    'user_id': member_id,
                    'user_name': 'John Smith',
                    'content': f'This is a thoughtful response to: {prompt_data["question"]}',
                    'is_pinned': False,
                    'status': 'pending',
                    'created_at': datetime.now(timezone.utc).isoformat()
                }
                await db.prompt_replies.insert_one(reply)
        
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
            'admin': {'email': 'admin@theroom.com', 'password': 'admin123'},
            'teacher': {'email': 'teacher@theroom.com', 'password': 'teacher123'},
            'member': {'email': 'member@theroom.com', 'password': 'member123'}
        }
    }

# ============== ROOT ==============

@api_router.get("/")
async def root():
    return {"message": "The Room API", "version": "1.0.0"}

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
