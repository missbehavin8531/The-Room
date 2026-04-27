# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Navigation: 4 Core Tabs
| Tab | Route | Content | Visibility |
|---|---|---|---|
| Home | /dashboard | "This Week" hero + course grid | Everyone |
| Connect | /connect | Group Chat + Direct Messages (tabs) | Everyone |
| My Progress | /progress | Streak, lessons, course completion | Everyone |
| Manage Group | /manage | Members, Attendance, Zoom, Security (tabs) | Teachers/Admins only |

## Course Types (Added 4/27/2026)
| Type | Lesson Tabs | Description |
|---|---|---|
| Scheduled | Live Room, Lesson, Discussion | Regular live meetings over Zoom or in-app video |
| Self-Paced | Lesson, Discussion | Students watch recordings at their own speed |
| Hybrid | Live Room, Lesson, Discussion | Mix of live sessions and self-paced content |

### Lesson Tab Definitions
- **Live Room** (was "NOW") — Join live Daily.co/Zoom video. Only shown for scheduled/hybrid courses.
- **Lesson** (was "NEXT") — Core content: recording/replay, resources, discussion prompts. Always the default active tab.
- **Discussion** (was "AFTER") — Comment thread for the lesson.

## Manage Group Hub
- **Members** — Pending approvals, member list, move/remove users (Admin)
- **Attendance** — Attendance reports and analytics
- **Zoom** — Zoom Integration (connect/disconnect, auto-import recordings) — moved from Settings
- **Security** — Security audit log (Admin only)

## Completed Work
- All core features (landing, guest mode, courses, lessons, chat, messages, progress, admin, attendance, security log, video, zoom, notifications)
- UX Restructuring: 4-tab nav, bottom tab bar, Connect page, Manage hub, CMD+K search (4/25-27/2026)
- Input Validation: XSS sanitization, char limits, rate limiting (4/25/2026)
- Design Consistency: Standardized headers, pill-tabs, card-organic, animations (4/27/2026)
- QA Audit: Guest WS fix, JWT rotation, health endpoint, test data cleanup (4/27/2026)
- Tab Renames: Me→My Progress, Manage→Manage Group, NOW→Live Room, NEXT→Lesson, AFTER→Discussion (4/27/2026)
- Course Types: course_type field (scheduled/self_paced/hybrid), context-aware lesson tabs (4/27/2026)
- Zoom relocated from Settings to Manage Group (4/27/2026)

## Backlog
- Phase 3: Merge Progress + Settings → unified "My Progress" page
- Video progress tracking
- Rate limiting on auth endpoints
- Push notifications
