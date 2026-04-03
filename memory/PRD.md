# The Room - PRD (Product Requirements Document)

## Project Overview
**Name:** The Room  
**Type:** Mobile-first Small Group Learning Platform  
**Value Proposition:** "A weekly discipleship hub: meet live, share resources, discuss, and follow up."  
**Architecture:** FastAPI backend + React frontend + MongoDB  
**Multi-tenant:** Yes — each group has isolated data via `group_id` scoping

---

## Core Requirements

### Authentication & Onboarding
- JWT-based custom auth (register, login, password reset)
- Guided onboarding tutorial for new users
- Role-based access: admin, teacher, member
- Admin approval required for new members (except group creators)

### Multi-Group Support (Multi-tenant)
- Group creation during registration (creator becomes admin, auto-approved)
- Group joining via invite code during registration
- All data queries scoped by `group_id` (courses, users, chat, analytics, search)
- Group management in Admin panel (name edit, invite code, member count)
- Cross-group data isolation verified
- Public invite code lookup endpoint for registration validation

### Course & Lesson Flow
- Course creation (title, description, cover image, unlock type)
- Lesson management with sequential or scheduled unlocking
- Resources & discussion attached to lessons
- Enrollment tracking and progress percentage
- Zoom external meeting link option OR in-app Daily.co video

### Engagement Features
- Email notifications via Resend (test domain)
- Web Push notifications via VAPID/PyWebPush
- PDF Certificate generation on course completion (ReportLab)
- Progress tracking dashboard
- Attendance reporting for teachers/admins

### Video Meetings
- Daily.co integration for live video rooms (REST API token generation)
- Camera/mic permission prompts before joining
- Zoom external meeting link alternative

### Communication
- Global chat (scoped per group)
- Direct messages between users
- Lesson discussion threads (prompts/replies)

### UI/UX
- Dark mode toggle (Tailwind class-based)
- Mobile-first responsive design (bottom nav on mobile)
- PWA support (Service Worker, manifest, app icons, favicon)
- Offline caching for lessons/resources
- Search & filter across courses and lessons

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # FastAPI entry point
│   ├── database.py           # MongoDB (motor) connection
│   ├── models.py             # Pydantic models (Group, User, Course, etc.)
│   ├── auth.py               # JWT auth, register, login, password reset
│   ├── routes/
│   │   ├── groups.py         # Group CRUD, invite codes, join
│   │   ├── users.py          # User management (scoped by group)
│   │   ├── courses.py        # Course CRUD (scoped by group)
│   │   ├── lessons.py        # Lesson CRUD
│   │   ├── attendance.py     # Attendance tracking
│   │   ├── video.py          # Daily.co video rooms
│   │   ├── social.py         # Chat, messages (scoped by group)
│   │   ├── progress.py       # Student progress tracking
│   │   ├── notifications.py  # Search, analytics (scoped by group)
│   │   └── seed.py           # Seed data, migration, cleanup
│   └── services/
│       ├── daily_service.py   # Daily.co API wrapper
│       └── email_service.py   # Resend email wrapper
├── frontend/
│   ├── public/
│   │   ├── sw.js             # Service Worker (push + offline)
│   │   ├── manifest.json     # PWA manifest
│   │   └── favicon.ico       # Multi-size favicon
│   ├── src/
│   │   ├── context/AuthContext.js
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Responsive layout with group name
│   │   │   ├── VideoRoom.jsx # Daily.co video with permissions
│   │   │   └── ThemeToggle.jsx
│   │   ├── lib/
│   │   │   ├── api.js        # API client with groupsAPI
│   │   │   └── utils.js
│   │   └── pages/
│   │       ├── Register.jsx  # 4-step wizard (name, group, email, pwd)
│   │       ├── Admin.jsx     # Admin panel with Group management tab
│   │       └── ...
└── memory/
    └── PRD.md
```

---

## Key DB Collections

| Collection | Key Fields |
|---|---|
| `groups` | id, name, description, invite_code, created_by |
| `users` | id, email, name, password, role, is_approved, group_id |
| `courses` | id, title, description, unlock_type, group_id, teacher_id |
| `lessons` | id, course_id, title, hosting_method, zoom_link |
| `attendance` | user_id, lesson_id, status |
| `chat_messages` | id, user_id, content, group_id |

---

## 3rd Party Integrations
- **Daily.co** — Video meetings (API key required)
- **Resend** — Email notifications (test domain: onboarding@resend.dev)

---

## What's Been Implemented (All Tested)

- Full auth flow (register, login, forgot password, reset password)
- Multi-group support (create, join, manage, scoped queries, cross-group isolation)
- 4-step registration wizard (Name → Group → Email → Password)
- Course & lesson CRUD with sequential/scheduled unlocking
- Video meeting rooms via Daily.co (REST API token generation)
- Zoom external meeting link option
- Email notifications (Resend test domain)
- Push notification service worker + VAPID
- PDF certificate generation (ReportLab)
- Progress tracking dashboard
- Attendance reporting
- Dark mode toggle
- Global chat + direct messages
- Search & filter (scoped per group)
- Offline caching (Service Worker)
- Mobile-first responsive UI (bottom nav, safe areas)
- PWA icons (favicon, logo192, logo512, apple-touch-icon)
- Admin panel with user management, analytics, group management
- Backend modularized into routes/services

---

## Credentials
- **Admin (The Room):** kirah092804@gmail.com / sZ3Og1s$f&ki
- **Admin (Wednesday Bible Study):** pastor.mike@test.com / test1234

---

## Backlog / Future Tasks

### P2
- Resource reordering with drag-and-drop

### P3 (Future)
- Real-time WebSocket for chat
- PPT preview via online viewer
- Video progress tracking
- Church invite share sheet (QR code + shareable link)
