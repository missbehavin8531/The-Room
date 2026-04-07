# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Roles & Responsibilities
- **Platform Admin** (`kirah092804@gmail.com`): Full platform access, no specific group assignment.
- **Teacher**: Admin access restricted to their assigned group(s). Has a dedicated setup wizard and dashboard.
- **Member**: Assigned to groups via invite code.
- **Guest**: Read-only access to demo group courses/lessons. Cannot chat, comment, or enroll. 4-hour session.

## Core Features (Implemented)
- **Premium Landing Page** — Hero with CTAs, features bento grid, how-it-works steps, testimonials, CTA section, integrated auth modal
- **Guest/Read-Only Demo Mode** — "Try Demo" button creates a guest JWT; guests can browse courses and lessons but cannot write
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
- Security Log for admins

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` class with glassmorphism
- **Tabs**: Clean underline `lesson-tab` pattern
- **Colors**: Earthy tones (sage greens, warm ambers, olive tones), primary accent
- **Animations**: `animate-fade-in`, `stagger-children`, entrance reveals
- **Navigation**: Floating glassmorphic bottom pill with active dot indicator
- **Toasts**: Auto-dismiss after 3 seconds
- **Landing Page**: Sticky header, asymmetric hero grid, bento feature cards, floating notification pills
- **Design reference**: `/app/design_guidelines.json`

## Architecture
- **Backend**: FastAPI, MongoDB (motor), WebSockets, JWT auth (including guest tokens)
- **Frontend**: React, Tailwind CSS, Shadcn UI, Service Workers
- **DB**: MongoDB with collections: users, groups, courses, lessons, resources, enrollments, chat_messages, attendance, security_logs

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
- CourseDetail + Progress page refinement - DONE
- Security/QA hardening (13 fixes) - DONE
- Security Log feature for admins - DONE
- Bug fixes (recording, toasts, scroll) - DONE
- 4 new demo courses (AI, Marketing, Wellness, Finance) - DONE
- Premium Landing Page + Guest Demo Mode - DONE (4/7/2026)

## Upcoming Tasks
- P2: Background sync for Offline Mode (Service Worker)
- P2: Read receipts and reactions in WebSocket Chat

## Future/Backlog
- P3: QR code invite share sheet
- P3: Video progress tracking
- Rate limiting on auth endpoints
