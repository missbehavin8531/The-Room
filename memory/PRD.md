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
- Real-time WebSocket chat (scoped per group) with REST fallback
- Typing indicators and online user count
| `chat_messages` | id, user_id, user_name, content, is_hidden, group_id, created_at |
- Direct messages between users
- Message Teacher feature (available to all approved users)
- Moderation: hide/delete messages (teacher/admin)

### Offline Mode (PWA)
- Service Worker caches API responses for offline viewing
- Network-first strategy for API, cache-first for static assets
- Expanded cacheable endpoints (courses, lessons, chat, groups, etc.)
- Offline banner indicator when device is offline
- App shell pre-caching for instant load

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
| `chat_messages` | id, user_id, user_name, content, is_hidden, group_id, created_at |

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
- **P1: Offline Mode Caching** — Enhanced service worker with expanded API caching, offline banner, cache versioning (DONE 4/6/2026)
- **P2: Real-time WebSocket Chat** — WebSocket endpoint at /api/ws/chat with JWT auth, typing indicators, online count, REST fallback polling (DONE 4/6/2026)
- **Video Recording Upload** — Teachers can upload Zoom/video recordings (MP4/MOV/WebM, up to 125MB) or paste Zoom cloud recording links to lessons. Recordings appear on NEXT (Watch Replay) tab with video player and delete controls. (DONE 4/6/2026)
- **Automatic Zoom Integration** — OAuth-based Zoom connection for teachers. When a Zoom cloud recording finishes, it auto-imports the MP4 into the teacher's most recent lesson. Includes: connect/disconnect flow, webhook handler (CRC + recording.completed), token refresh, Settings page UI with 3 states (Not Configured / Connect / Connected). Keys to be added by admin. (DONE 4/6/2026)
- **Home Page Overhaul** — Production-quality dashboard with Fraunces/Manrope typography, time-based greeting, green gradient lesson hero card with segmented progress pills, bento stats grid (streak/lessons/enrolled), quick actions, recent chat preview, course progress bars, and completion celebration. Fully mobile-responsive. (DONE 4/6/2026)
- **Discussion Questions Redesign** — Replaced clunky flat tab UI with accordion-style prompt cards. Each question is a numbered expandable card with inline reply form (circular send button), response count badge, clean reply cards with avatar/name/time, and icon-only moderation controls (status/pin/delete) revealed on hover. (DONE 4/6/2026)
- **Full Design Overhaul** — Elevated entire app to production-tier quality: (DONE 4/6/2026)
  - Global: Manrope body + Fraunces headings globally applied, muted-bg inputs with focus glow, refined card shadows, scrollbar styling, stagger animations
  - Login: Glassmorphic card over nature forest photo, pill inputs, integrated CTA
  - Bottom Nav: Floating glassmorphic pill with active dot indicator, weighted icon strokes
  - Lesson Tabs: Replaced chunky colored pill buttons with clean underline tabs (NOW/NEXT/AFTER)
  - Chat: iMessage-like asymmetric bubbles (dark olive own, light sage others), pill input with circular send, moderation hidden until hover
  - CSS Architecture: Full rewrite of index.css and App.css for consistency

---

## Credentials
- **Platform Admin:** kirah092804@gmail.com / sZ3Og1s$f&ki
- **Invite Code (The Room):** VJ3QHHL8
- **Demo Group Code:** DEMO2026

---

## Backlog / Future Tasks

### P3
- QR code for invite sharing
- Video progress tracking
