# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Roles & Responsibilities
- **Platform Admin** (`kirah092804@gmail.com`): Full platform access, no specific group assignment.
- **Teacher**: Admin access restricted to their assigned group(s). Has a dedicated setup wizard and dashboard.
- **Member**: Assigned to groups via invite code.

## Core Features (Implemented)
- Multi-group support (users belong to multiple groups via `group_ids[]`)
- Course management with lessons, resources, and drag-and-drop reordering
- Real-time WebSocket chat with group scoping
- Service Worker offline caching (P1)
- Daily.co in-app video conferencing
- Zoom OAuth auto-import + manual recording upload
- Email notifications (Resend) and web push
- Progress tracking with bento stats, SVG ring, per-course bars
- Attendance reporting
- Teacher dashboard with "Share Invite" widget
- Dark mode toggle, mobile-first responsiveness

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` class with glassmorphism
- **Tabs**: Clean underline `lesson-tab` pattern
- **Colors**: Earthy tones (sage, amber, olive), primary accent
- **Animations**: `animate-fade-in`, `stagger-children`, entrance reveals
- **Navigation**: Floating glassmorphic bottom pill with active dot indicator
- **Design reference**: `/app/design_guidelines.json`

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT auth
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **DB**: MongoDB with collections: users, groups, courses, lessons, resources, enrollments, chat_messages, attendance

## Security Hardening (Completed 4/6/2026)
- Password reset token no longer leaked in API response
- Registration enforces min 6-char passwords + name validation
- Empty/whitespace chat messages blocked (REST + WebSocket)
- Teacher CRUD scoped to own groups (delete users, update/delete/publish courses)
- CORS tightened to env-based origins (CORS_ORIGINS / FRONTEND_URL)
- Group deletion properly cleans `group_ids[]` via `$pull`
- JWT_SECRET mandatory from env (no hardcoded fallback)
- Resource download auth uses centralized JWT config
- Private messages accept admin as recipient
- Name length capped at 100 characters

## Completed Work Timeline
- Role Restructure (Admin/Teacher/Member) - DONE
- Multi-group architecture migration - DONE
- Drag-and-drop resource reordering - DONE
- Daily.co video fixes - DONE
- Share Invite feature - DONE
- Offline mode (Service Worker) - DONE (P1)
- Real-time WebSocket chat - DONE (P2)
- Zoom video upload + OAuth integration - DONE
- Full UI/UX design overhaul (all pages) - DONE
- CourseDetail + Progress page refinement - DONE (4/6/2026)
- Security/QA hardening (13 fixes) - DONE (4/6/2026)

## Upcoming Tasks
- P2: Background sync for Offline Mode (Service Worker)
- P2: Read receipts and reactions in WebSocket Chat

## Future/Backlog
- P3: QR code invite share sheet
- P3: Video progress tracking
- Rate limiting on auth endpoints
