from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional


# ============== CHURCH MODELS ==============

class ChurchCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ChurchUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ChurchResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: Optional[str] = None
    invite_code: str
    created_by: str
    created_at: str
    member_count: int = 0


# ============== AUTH MODELS ==============

class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: str = "member"

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    church_name: Optional[str] = None
    invite_code: Optional[str] = None

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
    onboarding_complete: bool = False
    church_id: Optional[str] = None
    church_name: Optional[str] = None


# ============== COURSE MODELS ==============

class CourseBase(BaseModel):
    title: str
    description: str
    thumbnail_url: Optional[str] = None
    is_published: bool = False
    unlock_type: str = "sequential"

class CourseCreate(CourseBase):
    pass

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    is_published: Optional[bool] = None
    unlock_type: Optional[str] = None

class CourseResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    description: str
    thumbnail_url: Optional[str] = None
    is_published: bool = False
    unlock_type: str = "sequential"
    teacher_id: str
    teacher_name: str
    created_at: str
    lesson_count: int = 0
    enrollment_count: int = 0
    is_enrolled: bool = False
    completed_lessons: int = 0
    total_lessons: int = 0


# ============== LESSON MODELS ==============

class LessonBase(BaseModel):
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
    is_completed: bool = False
    is_unlocked: bool = True
    youtube_url: Optional[str] = None


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
    status: str = "pending"
    created_at: str


# ============== COMMENTS & CHAT ==============

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


# ============== RESOURCES ==============

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


# ============== ATTENDANCE ==============

class AttendanceCreate(BaseModel):
    lesson_id: str
    action: str

class AttendanceResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    user_name: str
    lesson_id: str
    action: str
    created_at: str


# ============== LEGACY PROMPTS ==============

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


# ============== ANALYTICS ==============

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
    progress: int = 0


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


# ============== PRIVATE FEEDBACK MODELS ==============

class PrivateFeedbackCreate(BaseModel):
    content: str

class PrivateFeedbackResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    reply_id: str
    teacher_id: str
    teacher_name: str
    student_id: str
    student_name: str
    content: str
    created_at: str
    is_read: bool = False


# ============== PROGRESS MODELS ==============

class CourseProgressResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    course_id: str
    course_title: str
    total_lessons: int
    completed_lessons: int
    progress_percent: float
    last_activity: Optional[str] = None

class UserProgressResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    user_name: str
    total_courses_enrolled: int
    total_lessons_completed: int
    courses: List[CourseProgressResponse] = []
    streak_days: int = 0
    last_activity: Optional[str] = None


# ============== PUSH NOTIFICATION MODELS ==============

class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: dict

class ReadingReminderSettings(BaseModel):
    enabled: bool = True
    reminder_time: str = "08:00"
