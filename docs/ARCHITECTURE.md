# Architecture

```
┌───────────────────────────┐        ┌─────────────────────────────┐
│   Web App (React/Vite)    │  HTTPS │   Mobile / Tablet / Desktop  │
│   Tailwind + Router       │◀──────▶│   PWA-capable SPA            │
└─────────────┬─────────────┘        └─────────────────────────────┘
              │ fetch / JSON
              ▼
┌────────────────────────────────────────────────────────────────┐
│                        API (Express/TS)                       │
│  Auth · RBAC · Validation(Zod) · Rate-limit · Helmet           │
├────────────────────────────────────────────────────────────────┤
│  Routes: auth, courses, workshops, ai, questions, community,  │
│          announcements, notifications, admin, speaking, sync   │
├─────────────┬──────────────────┬───────────────────────────────┤
│ AI Gateway  │ Video/Progress   │ Certificate engine            │
│ (Mock/OR)   │ (heartbeat+XP)   │ (deterministic 90% rule)      │
├─────────────┴──────────────────┴───────────────────────────────┤
│  SQLite (node:sqlite)   ·   Local storage uploads              │
└────────────────────────────────────────────────────────────────┘
```

## Layers

1. **Presentation** — React SPA in `apps/web`. Mobile-first, responsive, PWA.
2. **API** — Express REST JSON API under `/api/*`. All auth/Zod validated.
3. **Domain logic** — Pure helpers in route modules (e.g. `computeAttendance`) make the business rules testable in isolation.
4. **Persistence** — SQLite with FK + WAL. SQL is written to be Postgres-compatible.
5. **AI Provider abstraction** — The gateway is the only place AI implementation details live; routes never talk to providers directly.

## Authentication & Authorization

- Registration / login / logout / JWT (7-day expiry) / bcrypt.
- Every protected route uses `authRequired` + `requireRole(...)` middleware server-side.
- Role is never trusted from the client; it's always read from the JWT → verified against DB.

## Offline

- Client enqueues progress & quiz attempts with idempotency keys.
- `/api/sync` applies events using `INSERT OR IGNORE` on the idempotency key so replays don't double-count.
- Downloaded lesson content is stored in localStorage (demo container — in production, wrap with DRM/encrypted blob storage).

## Why this stack

- **Node-only backend** (no external services required to run the project) works inside any sandbox.
- **React+Vite+Tailwind** gives a fast, modern, beautiful frontend with minimal boilerplate.
- **TypeScript end-to-end** keeps contracts clear across the monorepo.
- **SQLite** zero-config persistence with full relational modeling; trivially swap to Postgres/Supabase.
