# The Room - PRD (Product Requirements Document)

## Project Overview
**Name:** The Room  
**Type:** Mobile-first Small Group Learning Platform  
**Value Proposition:** "A weekly discipleship hub: meet live, share resources, discuss, and follow up."  
**Architecture:** FastAPI backend + React frontend + MongoDB  
**Multi-Group:** Yes — users can join multiple groups via invite codes

---

## Roles & Permissions
| Role | Access | Scope |
|------|--------|-------|
| Platform Admin (`kirah092804@gmail.com`) | Full access to everything | Global — all groups |
| Teacher | Group management, course/lesson CRUD, member approval | Limited to their managed group |
| Member | View courses, attend lessons, participate in discussions | Access to all their groups |

---

## Core Requirements

### Authentication & Onboarding
- JWT-based custom auth (register, login, password reset)
- Registration requires invite code (no group creation for members)
- Teacher setup wizard (3-step: Name Group -> Share Invite Code -> Get Started)
- `needs_group_setup` flag routes newly promoted teachers to setup wizard

### Multi-Group Support
- Users have `group_ids` array (can belong to multiple groups)
- Join additional groups via invite code in Settings page
- All data queries scoped by `group_ids` using `$in`
- Teachers limited to managing 1 group
- Admin can manage all groups globally

### Course & Lesson Flow
- Course creation with cover image, unlock type (sequential/scheduled)
- Lesson management with resources, prompts, discussion
- Resource drag-and-drop reordering (up/down + drag handles)
- Video meetings (Daily.co in-app + Zoom external link)

### Engagement Features
- Email notifications via Resend (test domain)
- Web Push notifications via VAPID/PyWebPush
- PDF Certificate generation on course completion
- Progress tracking dashboard
- Attendance reporting for teachers/admins

### Communication
- Global chat (scoped per group)
- Direct messages between users
- Message Teacher feature (available to all approved users)

### UI/UX
- Dark mode toggle (Tailwind class-based)
- Mobile-first responsive design (bottom nav on mobile)
- PWA support (Service Worker, manifest, app icons)
- Share Invite feature (Copy Link, Send Email, Copy Template)

---

## Key DB Collections

| Collection | Key Fields |
|---|---|
| `groups` | id, name, invite_code, created_by |
| `users` | id, email, name, role, is_approved, group_id, group_ids[], needs_group_setup |
| `courses` | id, title, group_id, teacher_id, unlock_type |
| `lessons` | id, course_id, title, hosting_method |
| `resources` | id, lesson_id, original_filename, file_type, order |

---

## 3rd Party Integrations
- **Daily.co** — Video meetings (REST API token generation)
- **Resend** — Email notifications (test domain)

---

## What's Been Implemented

- Full auth flow with multi-group support (DONE 4/6/2026)
- Multi-group: users have group_ids array, join via Settings (DONE 4/6/2026)
- Resource download with token-based auth (DONE 4/6/2026)
- Message Teacher fixed — endpoint uses require_approved (DONE 4/6/2026)
- Video fix — VideoTile local participant rendering (DONE 4/6/2026)
- Role Restructure: Admin / Teacher / Member with strict isolation
- Teacher Setup Wizard + frontend routing
- Resource drag-and-drop reordering
- Share Invite feature (Copy Link, Send Email, Copy Template)
- Course & lesson CRUD with sequential/scheduled unlocking
- Video rooms via Daily.co + Zoom fallback
- Email/Push notifications
- Progress tracking, Attendance reporting, PDF certificates
- Dark mode, Search, Mobile-first responsive UI

---

## Credentials
- **Platform Admin:** kirah092804@gmail.com / sZ3Og1s$f&ki
- **Invite Code (The Room):** VJ3QHHL8

---

## Backlog / Future Tasks

### P1
- Offline mode caching in Service Worker

### P2
- Real-time WebSocket for chat

### P3
- QR code for invite sharing
- Video progress tracking
