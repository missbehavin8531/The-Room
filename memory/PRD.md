# The Room - PRD (Product Requirements Document)

## Project Overview
**Name:** The Room  
**Type:** Mobile-first Small Group Learning Platform  
**Value Proposition:** "A weekly discipleship hub: meet live, share resources, discuss, and follow up."  
**Architecture:** FastAPI backend + React frontend + MongoDB  
**Multi-Group:** Yes — each group has isolated data via `group_id` scoping

---

## Roles & Permissions
| Role | Access | Scope |
|------|--------|-------|
| Platform Admin (`kirah092804@gmail.com`) | Full access to everything | Global — all groups |
| Teacher | Group management, course/lesson CRUD, member approval | Limited to their 1 group |
| Member | View courses, attend lessons, participate in discussions | Limited to their group |

---

## Core Requirements

### Authentication & Onboarding
- JWT-based custom auth (register, login, password reset)
- Registration requires invite code (no group creation for members)
- Guided onboarding tutorial for new users
- Teacher setup wizard (3-step: Name Group -> Share Invite Code -> Get Started)
- `needs_group_setup` flag routes newly promoted teachers to setup wizard

### Multi-Group Support
- Groups with unique invite codes
- All data queries scoped by `group_id`
- Teachers limited to 1 group
- Admin can manage all groups globally
- Admin can assign unassigned users to groups

### Course & Lesson Flow
- Course creation with cover image, unlock type (sequential/scheduled)
- Lesson management with resources, prompts, discussion
- Enrollment tracking and progress percentage
- Video meetings (Daily.co in-app or Zoom external link)

### Engagement Features
- Email notifications via Resend (test domain)
- Web Push notifications via VAPID/PyWebPush
- PDF Certificate generation on course completion
- Progress tracking dashboard
- Attendance reporting for teachers/admins

### Communication
- Global chat (scoped per group)
- Direct messages between users
- Lesson discussion threads (prompts/replies)

### UI/UX
- Dark mode toggle (Tailwind class-based)
- Mobile-first responsive design (bottom nav on mobile)
- PWA support (Service Worker, manifest, app icons)

---

## Code Architecture

```
/app
├── backend/
│   ├── server.py             # FastAPI entry point
│   ├── database.py           # MongoDB (motor) connection
│   ├── models.py             # Pydantic models
│   ├── auth.py               # JWT auth, needs_group_setup logic
│   ├── routes/
│   │   ├── groups.py         # Group CRUD, invite codes (teacher limited to 1)
│   │   ├── users.py          # User management, role promotion, group scoping
│   │   ├── courses.py        # Course CRUD (scoped by group)
│   │   ├── lessons.py        # Lesson CRUD
│   │   ├── attendance.py     # Attendance tracking
│   │   ├── video.py          # Daily.co video rooms
│   │   ├── social.py         # Chat, messages (scoped by group)
│   │   ├── progress.py       # Student progress tracking
│   │   ├── notifications.py  # Push notifications
│   │   └── seed.py           # Seed data, migration
│   └── services/
│       ├── daily_service.py   # Daily.co API wrapper
│       └── email_service.py   # Resend email wrapper
├── frontend/
│   ├── src/
│   │   ├── context/AuthContext.js  # Auth state, refreshUser, needsGroupSetup
│   │   ├── components/
│   │   │   ├── Layout.jsx          # Nav: Admin sees Admin, Teacher sees My Group
│   │   │   └── ...
│   │   └── pages/
│   │       ├── TeacherSetup.jsx    # 3-step group creation wizard
│   │       ├── TeacherDashboard.jsx # Teacher's group management
│   │       ├── Register.jsx        # 3-step wizard, invite code required
│   │       ├── Admin.jsx           # Platform admin only
│   │       └── ...
│   └── App.js                      # Routes with role-based guards
```

---

## Key DB Collections

| Collection | Key Fields |
|---|---|
| `groups` | id, name, invite_code, created_by |
| `users` | id, email, name, role, is_approved, group_id, needs_group_setup (computed) |
| `courses` | id, title, group_id, teacher_id, unlock_type |
| `lessons` | id, course_id, title, hosting_method |

---

## 3rd Party Integrations
- **Daily.co** — Video meetings (REST API token generation)
- **Resend** — Email notifications (test domain: onboarding@resend.dev)

---

## What's Been Implemented (All Tested)

- Full auth flow (register, login, forgot password, reset)
- Multi-group support with data isolation
- **Role Restructure: Platform Admin / Teacher / Member** (DONE - tested 4/3/2026)
  - Admin (kirah092804@gmail.com) has global access, sees Admin Panel
  - Teachers isolated to their group, see "My Group" in nav
  - `needs_group_setup` flag properly routes teachers to setup wizard
  - Teachers limited to 1 group (backend enforced)
  - /admin route restricted to admin-only
- **Teacher Setup Wizard** (3-step: Name → Invite Code → Get Started) (DONE - tested 4/3/2026)
- **Frontend Routing** for TeacherSetup and TeacherDashboard (DONE - tested 4/3/2026)
- 3-step registration wizard (Name → Invite Code → Email/Password)
- Course & lesson CRUD with sequential/scheduled unlocking
- Video rooms via Daily.co REST API + Zoom external link
- Email notifications (Resend test domain)
- Push notification service worker + VAPID
- PDF certificate generation
- Progress tracking dashboard
- Attendance reporting
- Dark mode toggle
- Global chat + direct messages
- Search & filter (scoped per group)
- Mobile-first responsive UI with PWA icons
- Admin panel with group management + user assignment
- Backend modularized into routes/services

---

## Credentials
- **Platform Admin:** kirah092804@gmail.com / sZ3Og1s$f&ki
- **Test Teacher (needs setup):** newteacher@test.com / teacher123

---

## Backlog / Future Tasks

### P1
- Verify step-by-step walkthrough UI across mobile viewports
- Offline mode caching in Service Worker

### P2
- Resource reordering with drag-and-drop

### P3
- Real-time WebSocket for chat
- PPT preview via online viewer
- Video progress tracking
- Group invite share sheet (QR code + shareable link)
