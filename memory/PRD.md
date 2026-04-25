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

## Information Architecture (Restructured 4/25/2026)
### Navigation: 4 Core Tabs (down from 8)
- **Home** (BookOpen) → /dashboard — "This Week" hero + course grid
- **Connect** (MessageCircle) → /connect — Unified inbox merging Chat + Messages
  - Tab: "Group Chat" — Real-time WebSocket group chat with reactions, editing, read receipts
  - Tab: "Direct Messages" — Private 1-on-1 messages to teachers
- **Me** (TrendingUp) → /progress — My progress (streak, lessons, courses)
- **Manage** (Shield) → /admin or /teacher-dashboard — Role-based management hub (Teacher/Admin only)

### Desktop: Top header nav with 4 tabs + search icon + avatar dropdown
### Mobile: Slim header (logo + search + avatar) + bottom tab bar
### Avatar Dropdown: Settings, Security Log (admin only), Sign Out

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` with glassmorphism
- **Layout**: 2-col course grid mobile, 3-col desktop
- **Nav**: Desktop header nav (4 tabs) + mobile bottom tab bar. Single "Courses" tab via Home — "This Week" hero lives inside the Courses view.
- **Startup Migration**: Auto-detects and fixes courses with orphaned/mismatched `group_id` on every server boot.

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT (including guest tokens)
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **Routing**: / = landing (unauthenticated) or dashboard (authenticated), /dashboard = merged home+courses, /connect = merged chat+messages

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
- Bug Fix: Lesson unlock now triggers when "I Attended" is marked (attendance creates lesson_completion) - DONE (4/12/2026)
- Bug Fix: Recording URL no longer mandatory when creating lessons - DONE (4/12/2026)
- P1 Offline Mode: Service Worker with cache-first static, network-first API with cache fallback, IndexedDB queue for offline writes, background sync replay, offline banner in Layout - DONE (4/12/2026)
- P2 Chat Reactions & Read Receipts: Toggle emoji reactions (6 emojis), reaction badges with counts, mark-read endpoint, "Seen by..." read receipts - DONE (4/12/2026)
- P3 QR Code Invite: QR code in Teacher Dashboard Share Invite section with Save QR download button - DONE (4/12/2026)
- Chat Message Editing: Authors can edit their own messages via inline editing, (edited) indicator shown, optimistic UI with rollback, guests blocked - DONE (4/12/2026)
- **UX Restructuring Phase 1: Navigation Shell** — Reduced 8 nav items to 4 core tabs (Home, Connect, Me, Manage). Desktop: streamlined top header. Mobile: slim header + bottom tab bar (replaced horizontal scrolling tabs). Fixed Security Log missing from desktop dropdown. - DONE (4/25/2026)
- **UX Restructuring Phase 2: Connect Page** — Merged Chat + Messages into unified /connect page with "Group Chat" and "Direct Messages" tabs. Old /chat and /messages routes redirect to /connect. - DONE (4/25/2026)

## Upcoming Tasks (UX Restructuring Phases 3-6)
- Phase 3: "Me" Page — Merge Progress + Settings into one cohesive page
- Phase 4: "Manage" Hub — Merge Admin + Teacher Dashboard + Attendance + Security Log into unified management page
- Phase 5: Global Search (CMD+K) — Replace standalone Search page with floating command palette
- Phase 6: Polish & Consistency — Standardize cards, spacing, animations

## Future/Backlog
- P2: Input Validation & Moderation (max char limits, XSS sanitization, rate limiting)
- P3: Video progress tracking
- P4: Rate limiting on auth endpoints
- P4: Push notifications/prompts for new lessons or chat messages
