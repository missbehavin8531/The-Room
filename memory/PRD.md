# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Roles & Responsibilities
- **Platform Admin** (`kirah092804@gmail.com`): Full platform access globally.
- **Teacher**: Admin access restricted to their assigned group(s).
- **Member**: Assigned to groups via invite code.
- **Guest**: Read-only demo access.

## Information Architecture (Final — 4/27/2026)
### Navigation: 4 Core Tabs
| Tab | Route | Content | Visibility |
|---|---|---|---|
| Home | /dashboard | "This Week" hero + course grid | Everyone |
| Connect | /connect | Group Chat + Direct Messages (tabs) | Everyone |
| Me | /progress | My progress, streak, course completion | Everyone |
| Manage | /manage | Members, Attendance, Security (tabs) | Teachers/Admins only |

### Global Features
- **CMD+K Search** — Floating command palette (replaces standalone Search page). Searches courses, lessons, discussions with debounced results.
- **Bottom Tab Bar** (Mobile) — 3-4 tabs, replaces old horizontal scrolling nav
- **Avatar Dropdown** — Settings, Security Log (admin), Sign Out

### Route Redirects (Legacy URLs)
- /chat → /connect
- /messages → /connect?tab=direct
- /admin → /manage
- /teacher-dashboard → /manage
- /attendance → /manage?tab=attendance
- /security-log → /manage?tab=security

## Input Validation & Moderation
| Field | Max Length |
|---|---|
| Chat messages | 1000 |
| Direct messages | 2000 |
| Comments/Prompt replies | 2000 |
| Course/Lesson title | 200 |
| Course/Lesson description | 2000 |
| User/Group name | 100 |

- XSS: All inputs sanitized (HTML/script tags stripped)
- Rate Limiting: Chat 10 msgs/30s per user (HTTP 429)

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **Key Patterns**: Embedded prop pattern for page composition, optimistic UI, offline caching

## Completed Work
- All core features (landing, guest mode, courses, lessons, chat, messages, progress, admin, attendance, security log, video, zoom, notifications)
- UX Restructuring Phase 1-2: 4-tab nav, bottom tab bar, Connect page (4/25/2026)
- Input Validation & Moderation (4/25/2026)
- UX Restructuring Phase 4: Unified Manage Hub (4/27/2026)
- UX Restructuring Phase 5: CMD+K Global Search (4/27/2026)

## Upcoming
- Phase 3: Merge Progress + Settings → unified "Me" page
- Phase 6: Design consistency pass (standardize cards, spacing, animations)

## Backlog
- Video progress tracking
- Rate limiting on auth endpoints
- Push notifications for new lessons/messages
