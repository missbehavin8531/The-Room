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
- **CMD+K Search** — Floating command palette accessible from header or Ctrl+K/Cmd+K. Debounced search across courses, lessons, discussions.
- **Bottom Tab Bar** (Mobile) — 3-4 tabs, replaces old horizontal scrolling nav
- **Avatar Dropdown** — Settings, Security Log (admin, links to /manage?tab=security), Sign Out

### Route Redirects
- /chat → /connect
- /messages → /connect?tab=direct
- /admin → /manage
- /teacher-dashboard → /manage
- /attendance → /manage?tab=attendance
- /security-log → /manage?tab=security

## Design System (Finalized 4/27/2026)
### Page Headers
Every page uses the overline+title pattern:
- Overline: `text-xs tracking-widest uppercase font-semibold text-muted-foreground` (Manrope)
- Title: `text-3xl sm:text-4xl font-bold tracking-tight` (Fraunces)
- Examples: "GOOD AFTERNOON" / "Teacher", "COMMUNITY" / "Connect", "MY JOURNEY" / "Progress", "ADMINISTRATION" / "Manage"

### Tab Switcher
All tabbed pages use `.pill-tabs` + `.pill-tab` + `.pill-tab-active` CSS classes (muted background, white active tab with shadow).

### Cards
`.card-organic` — border-radius 1.25rem, subtle shadow, white bg, hover lift.

### Animations
- `animate-fade-in` on all page sections with staggered `animationDelay`
- `stagger-children` for grid/list items
- Button active feedback via global `scale(0.97)` transform

### Typography
- Headings: Fraunces, serif
- Body: Manrope, sans-serif

## Input Validation & Moderation
- All user text inputs pass through `sanitize_text()` (HTML/script tags stripped, max length enforced)
- Chat rate limiting: 10 msgs/30s per user (HTTP 429)
- Frontend: maxLength attributes + visual character counters at 80%+ usage

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **Key Patterns**: Embedded prop pattern for page composition, optimistic UI, offline caching

## Completed Work
- All core features (landing, guest mode, courses, lessons, chat, messages, progress, admin, attendance, security log, video, zoom, notifications)
- UX Restructuring Phase 1+2: 4-tab nav, bottom tab bar, Connect page (4/25/2026)
- Input Validation & Moderation: XSS sanitization, max char limits, chat rate limiting (4/25/2026)
- UX Restructuring Phase 4: Unified Manage Hub (4/27/2026)
- UX Restructuring Phase 5: CMD+K Global Search (4/27/2026)
- A11y Fix: DialogTitle in SearchCommand CommandDialog (4/27/2026)
- Design Consistency Pass: Standardized page headers, pill-tabs, card-organic, animations, page-container (4/27/2026)

## Upcoming
- Phase 3: Merge Progress + Settings → unified "Me" page

## Backlog
- Video progress tracking
- Rate limiting on auth endpoints
- Push notifications for new lessons/messages
