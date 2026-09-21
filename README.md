# Aurex — Tamil Learning Ecosystem

**AUREX'26 Track 01** — A multilingual, AI-assisted, offline-capable Tamil language learning platform combined with a workshop & learning management portal.

Aurex combines YouTube-style video learning, Duolingo-style progression, live workshops, an AI Tamil tutor, speaking practice, verifiable certificates, communities, and teacher/learner/admin dashboards into a single production-structured monorepo.

## ✨ Key Features

- **Video Learning** — Custom player with play/pause, seek, speed, volume, captions, transcripts, chapters, resume position, watch history, completion tracking, per-heartbeat progress.
- **Courses & Lessons** — Modules → Lessons → Video/Vocabulary/Grammar/Scenario/Reading/Quiz types, with real Tamil content (Uyir/Mei Ezhuthukal, greetings, numbers, scenarios).
- **AI Tamil Tutor** — Gateway abstraction with provider adapters (OpenRouter + built-in knowledge-base fallback). Platform AI mode and encrypted **BYOAI** (Bring Your Own OpenRouter key).
- **Speaking Practice** — Web Speech API recognition with word/character similarity scoring (clear approximation disclaimer).
- **Live Workshops** — Create, register, check-in, leave, auto-compute attendance from join/leave timestamps.
- **90% Certificate Rule** — Deterministic: attendance ≥90% of required minutes ⇒ certificate. AI never decides.
- **Verifiable Certificates** — QR codes, public verification page at `/verify/CERT_ID`.
- **Questions Workflow** — Learners ask questions; AI auto-answers; teacher can edit/reject/resolve; analytics.
- **Community** — Groups, posts, comments, join flow.
- **Announcements & Notifications** — Global/course/workshop-scoped with per-user notifications.
- **Offline Learning** — Download lesson content to local storage; sync queue with idempotency keys; conflict-safe.
- **Gamification** — XP, streaks, daily goals, word/lesson/course counts (from real data).
- **RBAC** — Admin / Organizer / Learner. All authorization enforced server-side.
- **Search** — Across courses, lessons, workshops, vocabulary.
- **Multilingual Explanation UI** — English, Hindi, Telugu, Malayalam, Kannada (plus Tamil script throughout).
- **Dark/Light mode**, mobile-first responsive PWA-ready SPA.

## 🏗 Architecture

```
aurex797/
├── apps/web              React + Vite + Tailwind (mobile-first PWA-capable web app)
├── services/api          Node.js + Express + TypeScript API
├── packages/shared       Shared TypeScript types & constants
├── storage/              SQLite DB + uploaded files (created at runtime)
├── docs/                 Documentation
└── .env.example          Environment variables
```

- **Backend** — Node.js + Express + TypeScript using the built-in `node:sqlite` (no native compilation needed).
- **Database** — SQLite (default, zero-config). The schema is written in standard SQL and trivially portable to PostgreSQL/Supabase.
- **Auth** — JWT with bcrypt password hashing; refreshless bearer token; server-side RBAC on every protected route.
- **Storage** — Local filesystem (configurable). Swap for S3/Supabase Storage by changing the upload middleware.
- **AI Gateway** — Provider-agnostic interface (`generateText`, `chat`, `explainLesson`, `generateQuiz`, `practiceConversation`) with adapters for OpenRouter and a built-in knowledge-base fallback.

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (uses `node:sqlite` experimental module)
- npm 10+

### Install & Setup

```bash
cd aurex797
npm install
cp .env.example .env
npm run seed            # seeds demo data + accounts
npm run build           # builds shared, api, web
npm start               # starts the full app (API + serves built web) on port 4000
```

Then open **http://localhost:4000**.

For development with hot reload:

```bash
npm run dev:api    # API on http://localhost:4000
npm run dev:web    # Web Vite dev server on http://localhost:5173 (proxy to API)
```

## 🧪 Demo Accounts

Seeded automatically on first run.

| Role       | Email                     | Password       |
|------------|---------------------------|----------------|
| Admin      | admin@aurex.local         | admin123       |
| Organizer  | organizer@aurex.local     | organizer123   |
| Learner    | learner@aurex.local       | learner123     |
| Learner    | priya@aurex.local         | learner123     |

The demo learner already has a certificate (100% attendance) issued for the bootcamp workshop — look for it on the Certificates page after login.

## 🔐 Environment Variables

See `.env.example`:

| Variable | Default | Description |
|---|---|---|
| `PORT` | 4000 | Server port |
| `JWT_SECRET` | *(dev default)* | **Change in production** — long random secret |
| `DATABASE_URL` | `./storage/aurex.db` | SQLite path (or PostgreSQL URL in portable builds) |
| `STORAGE_DIR` | `./storage/uploads` | File upload directory |
| `OPENROUTER_API_KEY` | _empty_ | Enables real LLM AI. Without it the built-in knowledge-base answers are used (fully functional, offline-safe). |
| `AI_DEFAULT_PROVIDER` | `mock` | `mock` or `openrouter` |
| `AI_DAILY_LIMIT_PER_USER` | 50 | Platform-AI messages per user per day |
| `WEB_URL` | http://localhost:5173 | Used in CORS + OpenRouter referrer |

## 📚 Database

See [docs/DATABASE.md](docs/DATABASE.md) for schema details. Tables include:
`users, profiles, courses, course_modules, lessons, vocabularies, enrollments, lesson_progress, quizzes, quiz_questions, quiz_attempts, workshops, workshop_sessions, registrations, attendance, certificates, questions, announcements, notifications, communities, community_members, posts, comments, ai_conversations, ai_provider_settings, offline_sync_events`.

Key invariants:
- Foreign keys always enforced.
- Unique constraints on enrollments (user×course), registrations (user×workshop), attendance (user×session), idempotency keys for offline sync and quiz attempts.
- Indexes on hot query paths (progress, enrollments, notifications, courses.published).

## 🔌 API

See [docs/API.md](docs/API.md). All endpoints are under `/api/`. The web app talks to the API only via fetch; no server-side secrets are exposed.

## 🧩 Offline & Sync

Lessons can be downloaded to the browser via `localStorage` (demo-mode encrypted container). Offline events (progress, quiz attempts) are queued in IndexedDB/localstorage with idempotency keys, then POSTed to `/api/sync` when online. The server uses the idempotency keys to never double-apply quiz attempts or progress.

## 🤖 AI Safety

- AI never decides certificate eligibility (90% rule is server-side deterministic).
- AI cannot read private user data — the gateway only sends current-context information (lesson, level, language).
- Responses are constrained to Tamil-education scope via system prompt; built-in fallback responds educationally even if the provider fails.
- BYOAI keys are AES-256 encrypted at rest before storage.
- Platform AI has a configurable daily per-user rate limit.

## ✅ The 90% Certificate Rule

```
attendance_percent =  (sum of attended minutes across sessions) / (sum of required minutes) × 100
if attendance_percent >= 90: eligible
```

Implementation: `services/api/src/routes/workshops.ts::computeAttendance` and `issueCertificateIfEligible`. Unit tests verify the rule is deterministic and never issues below 90%.

## 🧪 Testing

```bash
npm test
```

Unit tests cover: attendance calculation, 90% eligibility, clamping at 100%, and certificate issuance (including the "don't issue below 90%" guarantee).

Manual E2E journey (also verified during development):

1. Admin login → create organizer →
2. Organizer creates course + module + lesson → publishes →
3. Learner registers → enrolls → watches lesson (progress recorded, completion true, XP awarded) →
4. Asks AI question (AI responds) →
5. Teacher responds (status becomes teacher_reviewed) →
6. Learner registers for workshop →
7. Joins/leaves session (attendance recorded) →
8. ≥90% attendance → certificate generated →
9. QR verification works publicly at `/verify/<cert_number>`.

## 🚢 Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The app builds to a single Node server that serves the REST API and the static web app from one port. A Dockerfile is trivial (node:22, copy the repo, `npm install --omit=dev`, `npm run build`, `CMD ["node", "services/api/dist/index.js"]`). For production set `JWT_SECRET` to a strong random value and back up the `storage/` directory.

## 🔒 Security

See [docs/SECURITY.md]: bcrypt password hashing, JWT with server-side RBAC, Helmet, CORS allow-listed, rate-limiting (200 req/min/IP), input validation with Zod, parameterized SQL via the sqlite driver (no SQL injection), encrypted BYOAI keys, size-limited uploads, no stack-trace leaks to clients.

## 📱 Mobile

The web app is fully mobile-first responsive and PWA-ready (manifest + theme color + offline UX). A React Native shell could wrap `/apps/web` via Capacitor or WebView with the same API — but the current submission provides a fully usable, installable mobile experience from the browser.

## 📄 Documentation Index

- [Architecture](docs/ARCHITECTURE.md)
- [Database schema](docs/DATABASE.md)
- [API reference](docs/API.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [Testing](docs/TESTING.md)
- [Demo guide](docs/DEMO.md)

## 🏅 Demo Script

1. Open http://localhost:4000 — landing page (Tamil script, value props, goals).
2. Register a new learner → onboarding (goal, level, native language) → dashboard with stats.
3. Open "Courses" → enroll in **Tamil from Zero** → start Lesson 1 (video player + progress tracking) → vocabulary tab.
4. Ask AI Tutor "How do I say thank you?" → AI responds in Tamil+transliteration+English.
5. Workshops → register for "Speak Tamil in 7 Days" → see attendance/certificate status.
6. Logout → login with `learner@aurex.local / learner123` → Certificates page shows a real issued cert → click to see QR/verify.
7. Open `/verify/AURX-...` (the cert number) to see the public verification page.
8. Logout → login `organizer@aurex.local / organizer123` → Dashboard → create a course, create a workshop, answer questions, issue certificates.
9. Logout → login `admin@aurex.local / admin123` → Admin dashboard → create an organizer, view users/stats.

வாழ்த்துக்கள்! 🎓
