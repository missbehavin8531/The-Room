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

## What's Been Implemented (Jan-Feb 2026)

### Backend (FastAPI + MongoDB)
- [x] User authentication (register/login/JWT)
- [x] User management with approval workflow
- [x] Role-based access control (Admin/Teacher/Member)
- [x] Courses CRUD with Zoom link support
- [x] Lessons CRUD with YouTube URL and ordering
- [x] Discussion comments per lesson
- [x] Global chat with message persistence
- [x] Private messages (Member→Teacher inbox)
- [x] File upload/download (local storage)
- [x] Attendance recording
- [x] Analytics endpoints
- [x] Seed data endpoint
- [x] **NEW: Course enrollment/unenrollment APIs**
- [x] **NEW: Get all lessons API (for calendar)**

### Frontend (React + Tailwind + Shadcn)
- [x] Login/Register pages with demo credentials
- [x] Pending approval screen
- [x] Dashboard with next lesson, video embed
- [x] Courses list with creation dialog
- [x] Course detail with lessons list
- [x] Lesson detail with YouTube, Discussion, Resources tabs
- [x] Global chat with real-time polling
- [x] Messages inbox for teacher communication
- [x] Admin panel with user approval, role management, analytics
- [x] Mobile-first responsive design
- [x] Calming sage green theme (Merriweather + Nunito fonts)
- [x] **NEW: Course enrollment tracking with enroll/unenroll buttons**
- [x] **NEW: Lesson calendar view with month navigation**
- [x] **NEW: File preview modal (PDF, PPT via Office viewer, images)**
- [x] **NEW: Enhanced loading skeletons with shimmer effect**
- [x] **NEW: Beautiful empty states with icons**
- [x] **NEW: Smooth fade-in animations on page load**
- [x] **NEW: "My Courses" section on dashboard**
- [x] **NEW: Mobile bottom navigation bar**

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
