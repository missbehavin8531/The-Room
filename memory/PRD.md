# Sunday School Education App - PRD

## Original Problem Statement
Mobile-first Sunday School education app for one church (v1) with:
- Roles: Admin, Teacher, Member
- Weekly learning flow: before/during/after lessons
- Attendance and participation tracking
- Discussion and chat features

## User Personas
1. **Admin**: User approval, moderation, reporting
2. **Teacher**: Course/lesson management, resource uploads
3. **Member**: View courses, join lessons, participate in discussions

## Core Requirements (Static)
- JWT email/password authentication with approval workflow
- Course and Lesson CRUD operations
- Zoom link storage (course/lesson level)
- YouTube video embedding
- Per-lesson discussion comments
- Global chat room
- Member→Teacher private messaging
- File uploads (PDF, PPT, images - max 25MB)
- Attendance tracking (Join Live / Marked Attended)
- Moderation tools (hide/delete content, mute users)
- Basic analytics (participation stats)

## What's Been Implemented (Jan 2026)

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
