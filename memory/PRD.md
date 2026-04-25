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
- Multi-group support, course management, drag-and-drop reordering
- Real-time WebSocket chat, Service Worker offline caching
- Daily.co video, Zoom OAuth auto-import, manual recording upload
- Email notifications (Resend), web push, progress tracking, attendance
- Security Log for admins, dark mode, mobile-first design

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

## Input Validation & Moderation (Implemented 4/25/2026)
### Character Limits
| Field | Max Length |
|---|---|
| Chat messages | 1000 |
| Direct messages | 2000 |
| Comments | 2000 |
| Course title | 200 |
| Course/Lesson description | 2000 |
| Lesson title | 200 |
| User name | 100 |
| Group name | 100 |
| Prompt replies | 2000 |

### XSS/HTML Sanitization
- All user text inputs pass through `sanitize_text()` which strips HTML/script tags, decodes entities, and enforces max length
- Applied to: chat, messages, comments, courses, lessons, groups, prompts, name updates
- Both REST API and WebSocket endpoints sanitized

### Rate Limiting
- Chat: 10 messages per 30 seconds per user (in-memory, returns HTTP 429)
- Applied to both REST POST /api/chat and WebSocket chat messages

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` with glassmorphism
- **Layout**: 2-col course grid mobile, 3-col desktop
- **Nav**: Desktop header nav (4 tabs) + mobile bottom tab bar
- **Character Counters**: Show when near limit (80%+ usage) with red at max

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
- Guest Mode Finalization - DONE (4/7/2026)
- Rich Demo Content: YouTube videos + 45 discussion prompts - DONE (4/7/2026)
- Group Member Management: Remove/Move members - DONE (4/8/2026)
- Perceived Performance: Skeleton loaders, optimistic UI - DONE (4/9/2026)
- Bug Fixes: Lesson unlock, recording URL optional - DONE (4/12/2026)
- P1 Offline Mode, P2 Chat Reactions/Read Receipts, P3 QR Code - DONE (4/12/2026)
- Chat Message Editing - DONE (4/12/2026)
- **UX Restructuring Phase 1+2**: 4-tab nav, bottom tab bar, Connect page (Chat+Messages merger), Security Log dropdown fix - DONE (4/25/2026)
- **Input Validation & Moderation**: XSS sanitization, max char limits, chat rate limiting (10/30s) - DONE (4/25/2026)

## Upcoming Tasks
- Phase 3: "Me" Page — Merge Progress + Settings into one cohesive page
- Phase 4: "Manage" Hub — Merge Admin + TeacherDashboard + Attendance + SecurityLog
- Phase 5: Global Search (CMD+K) — Replace standalone Search page with command palette
- Phase 6: Polish & Consistency

## Future/Backlog
- P3: Video progress tracking
- P4: Rate limiting on auth endpoints
- P4: Push notifications/prompts for new lessons or chat messages
