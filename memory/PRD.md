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
  - Reply status tracking
- **Reading Plan** - Weekly scripture reading schedule
- **Mark Attendance** - Manual attendance confirmation

## What's Been Implemented (Feb 2026)

### ✅ Lesson-Centric Flow (NEW)
- [x] **Now/Next/After tabs** - Three-tab navigation for lesson content
- [x] **Teacher Prompts** - Multiple discussion prompts per lesson
- [x] **Prompt Replies** - Members respond to specific prompts
- [x] **Pin Replies** - Teachers can pin important responses
- [x] **Teacher Notes** - Markdown-rendered notes in NEXT tab
- [x] **Reading Plan** - Weekly scripture schedule in AFTER tab
- [x] **Resource Management** - Order, mark primary deck
- [x] **Multi-action Attendance** - Tracks joined_live, watched_replay, viewed_slides, responded, marked_attended

### ✅ Backend (FastAPI + MongoDB)
- [x] User authentication with approval workflow
- [x] Role-based access control (Admin/Teacher/Member)
- [x] Courses & Lessons with full metadata
- [x] Teacher Prompts API (create, list, delete)
- [x] Prompt Replies API (reply, pin, status, delete)
- [x] Resource Management API (upload, order, primary, replace)
- [x] Multi-action attendance tracking
- [x] Discussion comments per lesson
- [x] Global chat
- [x] Private messages (Member→Teacher inbox)
- [x] File upload/download (local storage)
- [x] Analytics endpoints
- [x] Comprehensive seed data with prompts, replies, teacher notes, reading plans

### ✅ Frontend (React + Tailwind + Shadcn)
- [x] Login page with demo accounts
- [x] First-time welcome screen with redirect to lesson
- [x] Dashboard with current lesson card and progress indicator
- [x] **Lesson Detail page with Now/Next/After tabs**
- [x] YouTube video embedding
- [x] Markdown rendering for teacher notes and reading plan
- [x] Discussion with prompt tabs
- [x] Reply submission form
- [x] Pinned reply indicators
- [x] Reading plan display
- [x] Mark attendance button
- [x] File preview modal (PDF, PPT, images)
- [x] Mobile-first responsive design
- [x] Bottom navigation on mobile

## Demo Credentials
- **Admin**: admin@sundayschool.com / admin123
- **Teacher**: teacher@sundayschool.com / teacher123
- **Member**: member@sundayschool.com / member123

## Prioritized Backlog

### P0 - Done in MVP
All core requirements implemented including lesson-centric flow

### P1 - Next Priorities
- [ ] Teacher UI to create/edit prompts within lesson editor
- [ ] Teacher view of all responses grouped by prompt
- [ ] Email notifications for upcoming lessons
- [ ] Reply status management UI (pending/answered/needs_followup)
- [ ] Resource reordering drag-and-drop

### P2 - Future Enhancements
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
- `GET /api/lessons/next/upcoming` - Get next/current lesson
- `GET /api/courses/{id}/lessons` - Get all lessons for course

### Teacher Prompts
- `GET /api/lessons/{id}/prompts` - Get prompts for lesson
- `POST /api/lessons/{id}/prompts` - Create prompt (teacher)
- `DELETE /api/prompts/{id}` - Delete prompt (teacher)

### Prompt Replies
- `GET /api/prompts/{id}/replies` - Get replies for prompt
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
