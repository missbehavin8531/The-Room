# Sunday School Classroom - PRD

## Product Vision
A **narrow-wedge mobile-first** "Sunday School Classroom" web app for one church (v1), optimized for mixed ages and teacher workflows.

**NOT**: a full church management system, giving/events platform, or generic group-chat app.

## Core Wedge Promise
> In under 10 seconds, a member can: **Join Live → Watch Replay → View Slides → Respond to Prompt → Mark Attendance**

## User Personas
1. **Admin**: User approval, moderation, reporting
2. **Teacher**: Course/lesson management, resource uploads, view prompt responses
3. **Member**: Complete 5-step lesson workflow, participate in discussions

## Core Requirements (Static)
- JWT email/password authentication with approval workflow
- 5-step action dashboard (Join Live, Watch Replay, View Slides, Respond, Mark Attendance)
- Progress tracking per lesson
- Prompt responses (simple text)
- Course and Lesson management
- Zoom link storage (course/lesson level)
- YouTube video embedding
- File uploads (PDF, PPT, images - max 25MB)
- Per-lesson discussions
- Global chat
- Admin panel with moderation

## What's Been Implemented (Feb 2026)

### Core Wedge Features
- [x] **5-step action dashboard** - Join Live, Watch Replay, View Slides, Respond, Mark Attendance
- [x] **Progress bar** showing completion status (0/5 to 5/5)
- [x] **Prompt responses** - simple text response to lesson prompts
- [x] **Attendance tracking** for all 5 action types
- [x] **First-time user welcome** with auto-navigate to lesson
- [x] **Step-by-step registration** (3 steps: name, email, password)

### Backend (FastAPI + MongoDB)
- [x] User authentication with approval workflow
- [x] Role-based access control (Admin/Teacher/Member)
- [x] Courses & Lessons with prompts
- [x] Prompt responses API
- [x] Multi-action attendance tracking
- [x] Discussion comments per lesson
- [x] Global chat
- [x] Private messages (Member→Teacher inbox)
- [x] File upload/download (local storage)
- [x] Analytics endpoints

### Frontend (React + Tailwind + Shadcn)
- [x] Streamlined login page with demo accounts
- [x] Step-by-step registration with progress indicators
- [x] First-time welcome screen
- [x] 5-step action dashboard (all visible without scrolling)
- [x] Video player for Watch Replay
- [x] Prompt input modal for Respond
- [x] Progress tracking with real-time updates
- [x] Course enrollment & calendar view
- [x] File preview modal (PDF, PPT, images)
- [x] Mobile-first responsive design
- [x] Bottom navigation on mobile

## Demo Credentials
- **Admin**: admin@sundayschool.com / admin123
- **Teacher**: teacher@sundayschool.com / teacher123
- **Member**: member@sundayschool.com / member123

## Prioritized Backlog

### P0 - Done in MVP
All core requirements implemented

### P1 - Future Enhancements
- Email notifications for upcoming lessons (stubbed)
- Real-time WebSocket for chat
- PPT preview via online viewer
- Course enrollment tracking
- Lesson scheduling calendar view

### P2 - Nice to Have
- Push notifications (mobile PWA)
- Offline lesson viewing
- Video progress tracking
- Certificate generation
- Multiple church support (multi-tenant)

## Technical Stack
- **Backend**: FastAPI, MongoDB, JWT, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI
- **Storage**: Local filesystem for uploads
- **Deployment**: Supervisor-managed services

## API Routes Summary
- `/api/auth/*` - Authentication
- `/api/users/*` - User management
- `/api/courses/*` - Course CRUD
- `/api/lessons/*` - Lesson CRUD  
- `/api/chat` - Global chat
- `/api/messages/*` - Private messaging
- `/api/attendance` - Attendance tracking
- `/api/analytics` - Reporting
