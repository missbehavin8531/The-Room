# Sunday School Classroom - PRD

## Product Vision
A **narrow-wedge mobile-first** "Sunday School Classroom" web app for one church (v1), optimized for mixed ages and teacher workflows.

**NOT**: a full church management system, giving/events platform, or generic group-chat app.

## Core Wedge Promise
> The app is **lesson-centric**, revolving around a "Now / Next / After" experience on a Lesson page.

## User Personas
1. **Admin**: User approval, moderation, reporting
2. **Teacher**: Course/lesson management, resource uploads, manage discussion prompts, pin replies
3. **Member**: Complete lesson activities, participate in discussions, mark attendance

## Core User Flow: Now / Next / After

### NOW Tab
- **Join Live** - Opens Zoom link in new tab
- **Live Chat** - Link to global chat room
- Attendance auto-recorded when joining

### NEXT Tab
- **Watch Replay** - YouTube video embed
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

### ✅ Phase 1: Core Lesson-Centric Flow (Feb 2026)
- [x] **Now/Next/After tabs** - Three-tab navigation for lesson content
- [x] **Teacher Prompts** - Multiple discussion prompts per lesson (max 3)
- [x] **Prompt Replies** - Members respond to specific prompts
- [x] **Pin Replies** - Teachers can pin important responses
- [x] **Teacher Notes** - Markdown-rendered notes in NEXT tab
- [x] **Reading Plan** - Weekly scripture schedule in AFTER tab
- [x] **Resource Management** - Upload, download, set primary deck
- [x] **Multi-action Attendance** - Tracks joined_live, watched_replay, viewed_slides, responded, marked_attended

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
- **Admin**: admin@sundayschool.com / admin123
- **Teacher**: teacher@sundayschool.com / teacher123
- **Member**: member@sundayschool.com / member123

## Prioritized Backlog

### P0 - Done (MVP + Teacher Features)
All core lesson-centric flow and teacher management features implemented.

### P1 - Next Priorities (Done ✅)
- [x] Teacher UI to create/edit prompts within lesson editor
- [x] Teacher view of all responses grouped by prompt
- [x] Reply status management UI (pending/answered/needs_followup)

### P2 - Future Enhancements
- [ ] Email notifications for upcoming lessons
- [ ] Resource reordering with drag-and-drop
- [ ] Real-time WebSocket for chat
- [ ] PPT preview via online viewer
- [ ] Push notifications (mobile PWA)
- [ ] Offline lesson viewing
- [ ] Video progress tracking
- [ ] Certificate generation
- [ ] Multiple church support (multi-tenant)

## Technical Stack
- **Backend**: FastAPI, MongoDB, JWT, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, react-markdown
- **Storage**: Local filesystem for uploads
- **Deployment**: Supervisor-managed services

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
│   ├── server.py         # FastAPI app with all routes
│   ├── tests/            # pytest tests
│   └── uploads/          # File storage
├── frontend/
│   ├── src/
│   │   ├── components/   # Shared components
│   │   ├── pages/        # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LessonDetail.jsx  # Main lesson-centric page
│   │   │   ├── LessonEditor.jsx  # Teacher editing page
│   │   │   ├── TeacherResponses.jsx  # Teacher responses dashboard
│   │   │   └── ...
│   │   └── lib/
│   │       └── api.js    # API client
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
  "action": "joined_live|watched_replay|viewed_slides|responded|marked_attended"
}
```

## Test Reports
- `/app/test_reports/iteration_4.json` - Lesson-centric flow tests (100% pass)
- `/app/test_reports/iteration_5.json` - P1 teacher features tests (95% backend, 100% frontend)
- `/app/backend/tests/test_p1_features.py` - Comprehensive P1 API tests
