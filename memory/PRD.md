# The Room - PRD (Product Requirements Document)

## Project Overview
**Name:** The Room  
**Type:** Mobile-first Small Group Learning Platform for churches  
**Value Proposition:** "A weekly discipleship hub: meet live, share resources, discuss, and follow up."  
**Architecture:** FastAPI backend + React frontend + MongoDB  
**Multi-tenant:** Yes — each church has isolated data via `church_id` scoping

---

## Core Requirements

### Authentication & Onboarding
- JWT-based custom auth (register, login, password reset)
- Guided onboarding tutorial for new users
- Role-based access: admin, teacher, member
- Admin approval required for new members (except church creators)

### Multi-tenant (Church) Support
- Church creation during registration (creator becomes admin)
- Church joining via invite code during registration
- All data queries scoped by `church_id` (courses, users, chat, analytics, search)
- Church management in Admin panel (name edit, invite code, member count)
- Public invite code lookup endpoint for registration validation

### Course & Lesson Flow
- Course creation (title, description, cover image, unlock type)
- Lesson management with sequential or scheduled unlocking
- Resources & discussion attached to lessons
- Enrollment tracking and progress percentage

### Engagement Features
- Email notifications via Resend (test domain)
- Web Push notifications via VAPID/PyWebPush
- PDF Certificate generation on course completion (ReportLab)
- Progress tracking dashboard
- Attendance reporting for teachers/admins

### Video Meetings
- Daily.co integration for live video rooms
- Token generation via Daily.co REST API
- Camera/mic permission prompts before joining
- Recording support

### Communication
- Global chat (scoped per church)
- Direct messages between users
- Lesson discussion threads (prompts/replies)

### UI/UX
- Dark mode toggle (Tailwind class-based)
- Mobile-first responsive design (bottom nav on mobile)
- PWA support (Service Worker, manifest, app icons)
- Offline caching for lessons/resources
- Search & filter across courses and lessons

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # FastAPI entry point, includes all routers
│   ├── database.py           # MongoDB (motor) connection
│   ├── models.py             # Pydantic models (Church, User, Course, etc.)
│   ├── auth.py               # JWT auth, register, login, password reset
│   ├── routes/
│   │   ├── churches.py       # Church CRUD, invite codes, join
│   │   ├── users.py          # User management (scoped by church)
│   │   ├── courses.py        # Course CRUD (scoped by church)
│   │   ├── lessons.py        # Lesson CRUD
│   │   ├── attendance.py     # Attendance tracking
│   │   ├── video.py          # Daily.co video rooms
│   │   ├── social.py         # Chat, messages (scoped by church)
│   │   ├── progress.py       # Student progress tracking
│   │   ├── notifications.py  # Search, analytics (scoped by church)
│   │   └── seed.py           # Seed data, migration, cleanup
│   └── services/
│       ├── daily_service.py   # Daily.co API wrapper (REST API tokens)
│       └── email_service.py   # Resend email wrapper
├── frontend/
│   ├── public/
│   │   ├── sw.js             # Service Worker (push + offline caching)
│   │   ├── manifest.json     # PWA manifest with proper icons
│   │   ├── favicon.ico       # Multi-size favicon
│   │   ├── logo192.png       # PWA icon 192x192
│   │   └── logo512.png       # PWA icon 512x512
│   ├── src/
│   │   ├── context/AuthContext.js  # Auth context with church support
│   │   ├── components/
│   │   │   ├── Layout.jsx    # Responsive layout with church name
│   │   │   ├── VideoRoom.jsx # Daily.co video with permissions
│   │   │   └── ThemeToggle.jsx
│   │   ├── lib/
│   │   │   ├── api.js        # API client with churchesAPI
│   │   │   └── utils.js
│   │   └── pages/
│   │       ├── Register.jsx  # 4-step wizard (name, church, email, pwd)
│   │       ├── Admin.jsx     # Admin panel with Church management tab
│   │       ├── Search.jsx
│   │       ├── Settings.jsx
│   │       └── ...
│   └── tailwind.config.js
└── memory/
    └── PRD.md
```

---

## Key DB Collections

| Collection | Key Fields |
|---|---|
| `churches` | id, name, description, invite_code, created_by, created_at |
| `users` | id, email, name, password, role, is_approved, church_id, onboarding_complete |
| `courses` | id, title, description, unlock_type, church_id, teacher_id |
| `lessons` | id, course_id, title, video_url |
| `attendance` | user_id, lesson_id, status |
| `chat_messages` | id, user_id, content, church_id |
| `push_subscriptions` | user_id, subscription_data |

---

## 3rd Party Integrations
- **Daily.co** — Video meetings (requires API key)
- **Resend** — Email notifications (test domain: onboarding@resend.dev)

---

## What's Been Implemented

### Completed (All Tested)
- Full auth flow (register, login, forgot password, reset password)
- Multi-tenant church support (create, join, manage, scoped queries)
- Course & lesson CRUD with sequential/scheduled unlocking
- Video meeting rooms via Daily.co (REST API token generation)
- Email notifications (Resend test domain)
- Push notification service worker + VAPID
- PDF certificate generation (ReportLab)
- Progress tracking dashboard
- Attendance reporting
- Dark mode toggle
- Global chat + direct messages
- Search & filter (scoped per church)
- Offline caching (Service Worker)
- Mobile-first responsive UI (bottom nav, safe areas)
- PWA icons (favicon, logo192, logo512, apple-touch-icon)
- Admin panel with user management, analytics, church management
- Backend modularized from monolithic server.py to routes/services

---

## Credentials
- **Admin:** kirah092804@gmail.com / sZ3Og1s$f&ki
- **Default church invite code:** Check Admin > Church tab (regenerates)

---

## Backlog / Future Tasks

### P2
- Verify mobile responsiveness on physical devices
- Resource reordering with drag-and-drop

### P3 (Future)
- Real-time WebSocket for chat
- PPT preview via online viewer
- Video progress tracking
- Zoom external meeting link option
