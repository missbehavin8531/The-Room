# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Roles & Responsibilities
- **Platform Admin** (`kirah092804@gmail.com`): Full platform access globally. Name: "Teacher".
- **Teacher**: Admin access restricted to their assigned group(s).
- **Member**: Assigned to groups via invite code.
- **Guest**: Read-only demo access. Can browse courses/lessons, view chat (read-only). Cannot chat, message teachers, enroll, join video, or download resources.

## Core Features (Implemented)
- **Premium Landing Page** — Hero, features bento grid, how-it-works, testimonials, CTA, auth modal
- **Guest/Read-Only Demo Mode** — "Try Demo" creates a 4hr guest JWT; restricted from video/downloads/chat/messages
- **Merged Home + Courses** — Single unified dashboard with "This Week" hero + 2-column course grid
- **Guest Restrictions** — All tabs visible like real app; Chat: read-only with demo conversation; Messages & Progress: blocked with sign-up CTAs; Settings: only ThemeToggle; Search & Courses: read-only browsing
- Multi-group support, course management, drag-and-drop reordering
- Real-time WebSocket chat, Service Worker offline caching
- Daily.co video, Zoom OAuth auto-import, manual recording upload
- Email notifications (Resend), web push, progress tracking, attendance
- Security Log for admins, dark mode, mobile-first design
- No bottom navigation bar — top header + mobile dropdown only

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` with glassmorphism
- **Layout**: 2-col course grid mobile, 3-col desktop
- **Nav**: Desktop header nav + mobile avatar dropdown (no bottom bar). Single "Courses" tab (no separate Home tab) — "This Week" hero lives inside the Courses view.
- **Startup Migration**: Auto-detects and fixes courses with orphaned/mismatched `group_id` on every server boot. Finds the most populated group and reassigns orphaned courses. Admin also has `/api/admin/courses/fix-groups` manual endpoint.
- **Upcoming Lesson**: `/api/lessons/next/upcoming` now respects group boundaries (previously showed lessons from any group).

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT (including guest tokens)
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **Routing**: / = landing (unauthenticated) or dashboard (authenticated), /dashboard = merged home+courses

## Completed Work Timeline
- Role Restructure, Multi-group migration, Drag-and-drop - DONE
- Daily.co video, Share Invite, Offline mode (P1), WebSocket chat (P2) - DONE
- Zoom video upload + OAuth integration - DONE
- Full UI/UX design overhaul (all pages) - DONE
- Security/QA hardening (13 fixes) + Security Log - DONE
- Premium Landing Page + Guest Demo Mode - DONE
- Merged Home+Courses page, 2-col grid, scroll fix, guest video/download guards - DONE
- Guest Mode Finalization: bottom nav removed, Settings restricted, Chat read-only, Messages blocked, demo chat seeded, teacher renamed - DONE (4/7/2026)
- Rich Demo Content: YouTube videos added to all 15 lessons, 45 discussion prompts seeded, broken Gospel thumbnail fixed - DONE (4/7/2026)
- Group Member Management: Remove member from group, Move member between groups, Admin UI with per-member actions, admin guard protection - DONE (4/8/2026)
- Perceived Performance: Skeleton loaders (Chat, TeacherDashboard), optimistic UI (enrollment, chat send/delete, attendance, admin actions, prompt replies), global button press feedback, enhanced CSS animations - DONE (4/9/2026)

## Upcoming Tasks
- P2: Background sync for Offline Mode (Service Worker)
- P2: Read receipts and reactions in WebSocket Chat

## Future/Backlog
- P3: QR code invite share sheet
- P3: Video progress tracking
- Rate limiting on auth endpoints
