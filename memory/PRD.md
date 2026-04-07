# The Room - PRD

## Original Problem Statement
Mobile-first Small Group Learning Platform for one church (v1), named "The Room".
Value proposition: "A weekly discipleship hub: meet live, share resources, discuss, and follow up."

## Roles & Responsibilities
- **Platform Admin** (`kirah092804@gmail.com`): Full platform access globally.
- **Teacher**: Admin access restricted to their assigned group(s).
- **Member**: Assigned to groups via invite code.
- **Guest**: Read-only demo access. Can browse courses/lessons. Cannot chat, enroll, join video, or download resources.

## Core Features (Implemented)
- **Premium Landing Page** — Hero, features bento grid, how-it-works, testimonials, CTA, auth modal
- **Guest/Read-Only Demo Mode** — "Try Demo" creates a 4hr guest JWT; restricted from video/downloads/chat
- **Merged Home + Courses** — Single unified dashboard with "This Week" hero + 2-column course grid
- Multi-group support, course management, drag-and-drop reordering
- Real-time WebSocket chat, Service Worker offline caching
- Daily.co video, Zoom OAuth auto-import, manual recording upload
- Email notifications (Resend), web push, progress tracking, attendance
- Security Log for admins, dark mode, mobile-first design

## UI/UX Design System
- **Typography**: Fraunces (headings), Manrope (body)
- **Cards**: `card-organic` with glassmorphism
- **Layout**: 2-col course grid mobile, 3-col desktop
- **Nav**: Floating glassmorphic bottom pill, Home + Courses both → /dashboard
- **Padding**: `pb-44` mobile to clear floating nav

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
- Premium Landing Page + Guest Demo Mode - DONE (4/7/2026)
- Merged Home+Courses page, 2-col grid, scroll fix, guest video/download guards - DONE (4/7/2026)

## Upcoming Tasks
- P2: Background sync for Offline Mode (Service Worker)
- P2: Read receipts and reactions in WebSocket Chat

## Future/Backlog
- P3: QR code invite share sheet
- P3: Video progress tracking
- Rate limiting on auth endpoints
