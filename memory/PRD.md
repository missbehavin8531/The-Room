# The Room - PRD

## Product Vision
A **narrow-wedge mobile-first** "The Room" discipleship web app for one church (v1), optimized for mixed ages and teacher workflows.

**NOT**: a full church management system, giving/events platform, or generic group-chat app.

## Core Wedge Promise
> The app is **lesson-centric**, revolving around a "Now / Next / After" experience on a Lesson page.

## User Personas
1. **Teacher/Admin**: Course/lesson management, user approval, resource uploads, manage discussion prompts, pin replies
2. **Member**: Complete lesson activities, participate in discussions, mark attendance

## Core User Flow: Now / Next / After

### NOW Tab
- **Join Video Room** - Embedded Daily.co video conferencing (NEW!)
- **External Zoom Link** - Alternative Zoom meeting option
- **Live Chat** - Link to global chat room
- Attendance auto-recorded when joining

### NEXT Tab
- **Session Recordings** - Cloud recordings from Daily.co live sessions (NEW!)
  - Auto-enabled on video rooms
  - Video player with playback controls
  - Recording metadata (duration, participants)
- **Watch Replay** - YouTube video embed (fallback)
- **Teacher Notes** - Markdown-rendered notes from teacher
- Attendance tracked when video viewed

### AFTER Tab
- **Slides & Resources** - Upload/download PDF, PPT, images (25MB max)
- **Discussion** - Teacher-defined prompts with member replies
  - Multiple prompts per lesson (tabs)
  - Pin important replies (teacher)
  - Reply status tracking (pending/answered/needs_followup)
- **Reading Plan** - Weekly scripture reading schedule
- **Mark Attendance** - Manual attendance confirmation

## What's Been Implemented

### ✅ Phase 8: Search, Dark Mode Fix, Offline Mode (Mar 2026)
- [x] **Search Page** - Full search across courses, lessons, and discussions at /search
- [x] **Search Navigation** - Search link added to main navigation bar
- [x] **Babel Plugin Fix** - Fixed null reference crash in babel-metadata-plugin.js line 865
- [x] **Dark Mode Header** - Layout header now responds to dark mode (dark:bg-gray-900/90)
- [x] **Offline Mode** - Service worker caches static assets and API responses for offline viewing
- [x] **Search Results Enrichment** - Discussion results now include user_name and descriptions

### ✅ Phase 9: Backend Refactoring (Mar 2026)
- [x] **server.py Split** - Monolithic 3,228-line file → 55-line app factory
- [x] **database.py** - DB connection, JWT config, file upload config, all env vars
- [x] **models.py** - All Pydantic models (~310 lines)
- [x] **auth.py** - Auth routes + dependencies
- [x] **services/email_service.py** - Resend email integration
- [x] **services/daily_service.py** - Daily.co video API integration
- [x] **routes/users.py** - User management
- [x] **routes/courses.py** - Courses, enrollments, certificates
- [x] **routes/lessons.py** - Lessons, resources, completions
- [x] **routes/prompts.py** - Teacher prompts, replies, feedback, @mentions
- [x] **routes/social.py** - Comments, chat, private messages
- [x] **routes/attendance.py** - Attendance recording and reports
- [x] **routes/video.py** - Daily.co video rooms
- [x] **routes/progress.py** - Progress dashboard, student progress
- [x] **routes/notifications.py** - Search, analytics, push, email, reminders
- [x] **routes/seed.py** - Seed data

### ✅ Phase 7: Course Management & Unlock Modes (Feb 2026)
- [x] **Admin Removed from Demo** - Only Teacher and Member demo logins
- [x] **Course Cover Upload** - Upload images for course thumbnails
- [x] **Course Editor** - Full edit modal for courses (title, description, cover, unlock mode, published status)
- [x] **Unlock Type Selection** - Teachers choose Sequential or Scheduled mode per course
- [x] **Sequential Mode** - Lessons unlock one-by-one after completing previous
- [x] **Scheduled Mode** - Lessons unlock based on their scheduled date
- [x] **Course Wizard 3 Steps** - Details → Settings → Review

### ✅ Phase 6: MVP Polish & Guided Experience (Feb 2026)
- [x] **Hosting Method Simplified** - Single choice only (In-App or Zoom)
- [x] **Recording Source** - Multiple options (Daily.co, YouTube, External URL, None)
- [x] **Sequential Lessons** - Lessons unlock in order after completion
- [x] **Course/Lesson Publishing** - Draft/Published toggle for visibility control
- [x] **Progress Tracking** - Visual progress bar and lesson completion
- [x] **Role Consolidation** - Teacher = Admin (simplified roles)
- [x] **Lesson Wizard** - Step-by-step guided lesson creation (5 steps)
- [x] **Course Wizard** - Step-by-step guided course creation (3 steps)
- [x] **Wizard Chaining** - LessonWizard auto-opens after CourseWizard
- [x] **Onboarding Tutorial** - First-time user tutorial (role-specific content)
- [x] **Onboarding Persistence** - Tutorial state saved in database, shows only once

### ✅ Phase 5: Branding & Hosting Method (Feb 2026)
- [x] **Rebranding** - Changed from "Sunday School" to "The Room" with logo
- [x] **Hosting Method** - Lesson field for `hosting_method`: "in_app", "zoom", or "both"
- [x] **Teacher Selection** - Lesson Editor shows Class Hosting Method card with 3 options
- [x] **Student View** - NOW tab shows only the selected hosting option(s)
- [x] **Authorization** - Only teachers/admins can change hosting method

### ✅ Phase 4: Cloud Recording Playback (Feb 2026)
- [x] **Cloud Recording Enabled** - Daily.co rooms created with `enable_recording: "cloud"`
- [x] **Recordings API** - Fetch recordings from Daily.co via REST API
- [x] **Recording Access Links** - Generate download URLs for recorded sessions
- [x] **NEXT Tab Recordings** - Session recordings displayed in Watch Replay tab
- [x] **Recording Metadata** - Duration, participant count, timestamp
- [x] **YouTube Fallback** - Shows YouTube content when no recordings available
- [x] **Attendance Tracking** - Records 'watched_replay' when viewing recordings
- [x] **Teacher Recording Controls** - Start/Stop recording button in video room (teacher/admin only)
- [x] **Recording Status Indicator** - Shows "REC" badge when recording is active

### ✅ Phase 3: Embedded Video Conferencing (Feb 2026)
- [x] **Daily.co Integration** - Real-time video rooms embedded in app
- [x] **Persistent Room per Lesson** - Each lesson has its own video room
- [x] **Video Controls** - Camera, microphone, screen share, fullscreen, leave
- [x] **Participant Count** - Shows how many people are in the room
- [x] **Attendance Tracking** - Records 'joined_video' when user joins
- [x] **External Zoom Option** - Alternative meeting link still available

### ✅ Phase 1: Core Lesson-Centric Flow (Feb 2026)
- [x] **Now/Next/After tabs** - Three-tab navigation for lesson content
- [x] **Teacher Prompts** - Multiple discussion prompts per lesson (max 3)
- [x] **Prompt Replies** - Members respond to specific prompts
- [x] **Pin Replies** - Teachers can pin important responses
- [x] **Teacher Notes** - Markdown-rendered notes in NEXT tab
- [x] **Reading Plan** - Weekly scripture schedule in AFTER tab
- [x] **Resource Management** - Upload, download, set primary deck
- [x] **Multi-action Attendance** - Tracks joined_live, watched_replay, viewed_slides, responded, marked_attended, joined_video

### ✅ Phase 2: Teacher Management Features (Feb 2026)
- [x] **Lesson Editor** - Edit all lesson content including:
  - Basic info (title, description, date, zoom link, youtube URL)
  - Teacher Notes (markdown)
  - Reading Plan (markdown)
  - Discussion Prompts (create, edit, delete, max 3 per lesson)
- [x] **Teacher Responses Dashboard** - View all student responses:
  - Stats overview (Total, Pending, Answered, Follow-up)
  - Prompt selector dropdown
  - Reply list with user info and timestamps
  - Status management (Pending → Answered → Needs Follow-up)
  - Pin/Unpin replies
  - Delete replies with confirmation
- [x] **Teacher UI Access** - Edit/Responses buttons on lesson page (teacher-only)

### ✅ Foundation Features
- [x] User authentication with approval workflow
- [x] Role-based access control (Admin/Teacher/Member)
- [x] Courses & Lessons with full metadata
- [x] Discussion comments per lesson
- [x] Global chat
- [x] Private messages (Member→Teacher inbox)
- [x] File upload/download (local storage)
- [x] Analytics endpoints

## Demo Credentials
- **Teacher**: teacher@theroom.com / teacher123
- **Member**: member@theroom.com / member123

## Prioritized Backlog

### P0 - Done (All MVP + Enhancements + Refactoring)
All core lesson-centric flow, teacher management, video conferencing, progress tracking, settings, attendance reports, search, dark mode, push notifications, email notifications, certificate generation, offline mode implemented. Backend refactored into modular files.

### P1 - Next Priorities
- [x] ~~Refactor server.py (~3k lines) into modular routes/models~~ DONE
- [ ] Proper PWA Favicon and App Icons
- [ ] Private teacher feedback UI improvements

### P2 - Future Enhancements
- [ ] Resource reordering with drag-and-drop
- [ ] Real-time WebSocket for chat
- [ ] PPT preview via online viewer
- [ ] Video progress tracking
- [ ] Multiple church support (multi-tenant)

## Technical Stack
- **Backend**: FastAPI (modular routes), MongoDB, JWT, bcrypt, httpx
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, react-markdown
- **Video**: Daily.co SDK (@daily-co/daily-js, @daily-co/daily-react, jotai)
- **Email**: Resend SDK
- **Push**: PyWebPush with VAPID
- **PDF**: ReportLab for certificates
- **Storage**: Local filesystem for uploads
- **Deployment**: Supervisor-managed services

## Backend Architecture (Post-Refactor)
```
/app/backend/
├── server.py          # App factory, middleware (~55 lines)
├── database.py        # MongoDB connection, all env config
├── models.py          # All Pydantic models (~310 lines)
├── auth.py            # Auth routes + dependencies
├── services/
│   ├── email_service.py  # Resend email integration
│   └── daily_service.py  # Daily.co video API
├── routes/
│   ├── users.py          # User management
│   ├── courses.py        # Courses, enrollments, certificates
│   ├── lessons.py        # Lessons, resources, completions
│   ├── prompts.py        # Teacher prompts, replies, feedback
│   ├── social.py         # Comments, chat, private messages
│   ├── attendance.py     # Attendance recording + reports
│   ├── video.py          # Daily.co video rooms
│   ├── progress.py       # Progress dashboard
│   ├── notifications.py  # Search, analytics, push, reminders
│   └── seed.py           # Seed data
└── tests/
```

## API Routes Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Lessons
- `GET /api/lessons/{id}` - Get lesson with prompts, resources, attendance
- `PUT /api/lessons/{id}` - Update lesson content (teacher)
- `GET /api/lessons/next/upcoming` - Get next/current lesson
- `GET /api/courses/{id}/lessons` - Get all lessons for course

### Video Rooms (NEW!)
- `POST /api/lessons/{id}/video/join` - Join video room (creates room if needed)
- `GET /api/lessons/{id}/video/status` - Get room status and participant count
- `GET /api/lessons/{id}/recordings` - Get cloud recordings for lesson
- `POST /api/lessons/{id}/recording/start` - Start cloud recording (teacher/admin)
- `POST /api/lessons/{id}/recording/stop` - Stop cloud recording (teacher/admin)
- `GET /api/lessons/{id}/recording/status` - Get current recording status

### Teacher Prompts
- `GET /api/lessons/{id}/prompts` - Get prompts for lesson
- `POST /api/lessons/{id}/prompts` - Create prompt (teacher, max 3)
- `PUT /api/prompts/{id}` - Update prompt question (teacher)
- `DELETE /api/prompts/{id}` - Delete prompt (teacher)

### Prompt Replies
- `GET /api/prompts/{id}/replies` - Get replies for prompt
- `GET /api/lessons/{id}/all-replies` - Get all replies grouped by prompt (teacher)
- `POST /api/prompts/{id}/reply` - Submit reply
- `PUT /api/replies/{id}/pin` - Pin/unpin reply (teacher)
- `PUT /api/replies/{id}/status` - Update status (teacher)
- `DELETE /api/replies/{id}` - Delete reply (teacher)

### Attendance
- `POST /api/attendance` - Record attendance action
- `GET /api/attendance/my/{lesson_id}` - Get user's attendance for lesson

### Resources
- `POST /api/lessons/{id}/resources` - Upload resource
- `PUT /api/resources/{id}/primary` - Set as primary
- `PUT /api/resources/{id}/order` - Update order
- `GET /api/resources/{id}/download` - Download file

## Architecture

```
/app
├── backend/
│   ├── server.py         # FastAPI app with all routes + DailyService
│   ├── tests/            # pytest tests
│   └── uploads/          # File storage
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VideoRoom.jsx  # Daily.co video component (NEW!)
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LessonDetail.jsx  # Main lesson-centric page
│   │   │   ├── LessonEditor.jsx  # Teacher editing page
│   │   │   ├── TeacherResponses.jsx  # Teacher responses dashboard
│   │   │   └── ...
│   │   └── lib/
│   │       └── api.js    # API client + videoRoomAPI
│   └── package.json
└── memory/
    └── PRD.md
```

## Database Schema

### lessons
```json
{
  "id": "uuid",
  "course_id": "uuid",
  "title": "string",
  "description": "string",
  "youtube_url": "string",
  "zoom_link": "string",
  "lesson_date": "date",
  "teacher_notes": "markdown string",
  "reading_plan": "markdown string",
  "order": "int"
}
```

### teacher_prompts
```json
{
  "id": "uuid",
  "lesson_id": "uuid",
  "question": "string",
  "order": "int"
}
```

### prompt_replies
```json
{
  "id": "uuid",
  "prompt_id": "uuid",
  "lesson_id": "uuid",
  "user_id": "uuid",
  "content": "string",
  "is_pinned": "boolean",
  "status": "pending|answered|needs_followup"
}
```

### attendance
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "lesson_id": "uuid",
  "action": "joined_live|watched_replay|viewed_slides|responded|marked_attended|joined_video"
}
```

## Test Reports
- `/app/test_reports/iteration_4.json` - Lesson-centric flow tests (100% pass)
- `/app/test_reports/iteration_5.json` - P1 teacher features tests (95% backend, 100% frontend)
- `/app/test_reports/iteration_6.json` - Daily.co video integration tests (100% pass)
- `/app/test_reports/iteration_7.json` - Cloud recordings feature tests (100% pass)
- `/app/test_reports/iteration_8.json` - Branding & hosting method tests (100% pass)
- `/app/test_reports/iteration_9.json` - MVP polish tests (100% pass)
- `/app/test_reports/iteration_10.json` - Onboarding & Wizard flows (100% pass, 22 tests)
- `/app/test_reports/iteration_11.json` - Course unlock modes & editor (100% pass, 39 tests)
- `/app/test_reports/iteration_12.json` - Phase 2-4 features: Progress, Settings, Attendance (100% pass, 22 tests)
- `/app/test_reports/iteration_13.json` - Search, Dark Mode Header, Offline Mode (100% pass, 8 backend + all frontend)
- `/app/test_reports/iteration_14.json` - Backend Refactoring validation (100% pass, 22 backend + all frontend)
- `/app/backend/tests/` - Various API test files

## Phase 2 Enhancements (Feb 2026)
### Implemented:
- **Push Notifications (PWA)** - Service worker for web push, subscription management
- **Settings Page** - New /settings page for notification preferences
- **Daily Reading Reminders** - Users can enable daily scripture reminders with custom time
- **@Mentions in Discussions** - Mention users with @username, triggers email + push notification
- **VAPID Keys** - Generated and configured for web push

### Backend Endpoints Added:
- `GET /api/push/vapid-public-key` - Get VAPID public key for subscription
- `POST /api/push/subscribe` - Subscribe to push notifications
- `DELETE /api/push/unsubscribe` - Unsubscribe from push notifications
- `GET /api/reading-reminders/settings` - Get user's reminder settings
- `PUT /api/reading-reminders/settings` - Update reminder settings
- `POST /api/reading-reminders/send` - Send reading reminders (for cron job)

### Frontend Files Added:
- `/frontend/public/sw.js` - Service worker for push notifications
- `/frontend/src/lib/pushService.js` - Push notification service
- `/frontend/src/components/NotificationSettings.jsx` - Notification settings UI
- `/frontend/src/pages/Settings.jsx` - Settings page

## Phase 1 Enhancements (Feb 2026)
### Implemented:
- **Email Service** - Resend integration for transactional emails (backend ready, needs API key)
- **Private Teacher Feedback** - Backend API for teachers to send private feedback to students
- **Progress Dashboard** - New /progress page with stats (streaks, lessons done, course progress)
- **Student Progress View** - Teachers can see all students' progress in a table
- **Welcome Emails** - Sent when users are approved (needs Resend API key)
- **Lesson Reminder Emails** - Endpoint to send reminders for upcoming lessons

### Backend Endpoints Added:
- `POST /api/replies/{reply_id}/feedback` - Create private feedback
- `GET /api/replies/{reply_id}/feedback` - Get feedback for a reply
- `GET /api/my-feedback` - Get all feedback for current user
- `GET /api/my-feedback/unread-count` - Get unread feedback count
- `PUT /api/feedback/{feedback_id}/read` - Mark feedback as read
- `GET /api/my-progress` - Get user's progress dashboard data
- `GET /api/teacher/student-progress` - Get all students' progress (teacher only)
- `POST /api/notifications/send-lesson-reminders` - Send email reminders

### Pending (needs Resend API key):
- Email notifications are backend-ready but require RESEND_API_KEY in .env

## 3rd Party Integrations
- **Daily.co** - Embedded video conferencing (API key in backend .env)
- **YouTube** - Video embed for lesson replays
- **Zoom** - External meeting link option
