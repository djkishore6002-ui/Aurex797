# Solai — AI-Powered Tamil Learning, Workshop & LMS Platform

Solai (தமிழ்: சோலை, "forest grove") is a complete, production-oriented web platform for learning
Tamil — structured video courses, quizzes, speaking practice, live workshops with QR attendance,
deterministic certificate issuance with public verification, communities, and a context-aware
AI Tamil Tutor that runs fully offline when no API key is configured.

Built with **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS**, an **embedded
SQLite database** (Node 22's built-in `node:sqlite` — zero native dependencies) and a
provider-abstracted **AI layer** (OpenRouter → user BYOAI key → built-in local retrieval
engine).

---

## Quick start

Requirements: **Node.js ≥ 22.5** (uses the built-in `node:sqlite` module) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

That's it. On first request the database is created, the schema is applied and a realistic
demo dataset is seeded automatically (courses, lessons, vocabulary, quizzes, workshops with
attendance, a verified certificate, communities, FAQ/CMS content, AI knowledge index).

### Demo accounts (shown on /login when seeded)

| Role        | Email                 | Password         | Notes                                                    |
| ----------- | --------------------- | ---------------- | -------------------------------------------------------- |
| Super Admin | admin@solai.test      | admin1234        | Full admin console at `/admin`                           |
| Organizer   | organizer@solai.test  | organizer1234    | `/organizer` — workshops, attendance, learner questions  |
| Teacher     | teacher@solai.test    | teacher1234      | Answers learner questions (`/organizer/questions`)       |
| Learner     | priya@solai.test      | learner1234      | Mid-course, 97.5% bootcamp attendance, holds cert `TN-2026-000001` |
| Learner     | marco@solai.test      | learner1234      | 55% attendance — demonstrates the ineligible path        |

### Useful scripts

```bash
npm run typecheck    # strict tsc --noEmit
npm test             # vitest unit tests (pronunciation, crypto, auth, attendance, RAG)
bash e2e-smoke.sh    # 47-check end-to-end API/UX suite against a running server
npm run db:reset     # wipe data/solai.db (self-reseeds on next boot)
```

---

## Feature map

**Learner**
- Home with CMS-driven hero/sections, course & workshop catalog, global search
- Video lessons with real progress tracking (completion requires meeting the
  required-watch percentage — opening a lesson does not complete it)
- Server-scored quiz engine; XP/progress gamification; vocabulary flashcards
- Speaking practice (Web Speech API + word-level Levenshtein diff with per-word feedback)
- Scenario practice ("Order food", "Take an auto", …) with guided dialogue
- Workshop registration: **free workshops confirm instantly, paid ones stay
  PENDING** (there is no fake payment flow — organizers confirm by hand)
- QR check-in/out at workshops; deterministic **90% attendance → certificate**
  eligibility (computed server-side — the AI can never decide eligibility)
- Certificate claim + public verification page `/verify/TN-2026-000001` with QR code
- Communities (join/post/comment/react/report), announcements, notifications
- Floating **AI Tamil Tutor** — context-aware per page (lesson content, vocab,
  workshop, FAQ), answers with Tamil script + transliteration + meaning

**Organizer / Teacher** (`/organizer`)
- Manage workshops & sessions, QR check-in/out, attendance review
- Answer learner questions (teacher), with AI preliminary answers as a drafting aid

**Super Admin** (`/admin`, 13 sections)
- Dashboard analytics, users & organizers (RBAC), courses/modules/lessons/quizzes,
  vocabulary, workshops & attendance, certificates + templates, announcements
  (global / course / workshop / community / single-user scoping), communities &
  moderation (hide/delete posts, reports), learner Q&A, AI provider settings
  (provider, models, prompts, limits, BYOAI toggle) with one-click knowledge
  reindexing and usage logs, full website CMS (hero, sections, pages, FAQ, nav,
  footer, banners — edits reflect live), audit log

**Platform**
- "Midnight aurora" dark theme: violet→cyan gradient accents, glassmorphism
  surfaces, aurora-glow hero, Plus Jakarta Sans + Noto Sans Tamil typography
- PWA: web manifest + service worker (shell caching, never caches `/api`)
- Security: scrypt password hashing, signed httpOnly session cookies, strict
  server-side RBAC on every route, per-route API rate limiting, AES-256-GCM
  encryption of BYOAI keys (hint-only display), audit logging of admin actions

---

## Architecture

```
src/
├── app/                  # Next.js App Router: pages + /api route handlers
│   ├── (learner routes)  # /, /learn/[course]/[lesson], /quiz/[id], /workshops/[slug],
│   │                     # /practice/*, /community/*, /ask, /verify/[id], /dashboard …
│   ├── admin/            # Super-admin console (13 sections, AdminShell layout)
│   ├── organizer/        # Organizer/teacher console
│   └── api/              # JSON API (auth, progress, quizzes, workshops, attendance,
│                         #   certificates, ai/tutor, search, admin/* …)
├── components/           # Client components: AiTutor, QuizEngine, VideoPlayer,
│                         #   SpeakClient, RegisterAttend, PwaRegister, ui primitives
├── db/
│   ├── schema.sql        # ~45 tables (idempotent, CREATE TABLE IF NOT EXISTS)
│   ├── index.ts          # getDb() lazy bootstrap + self-healing reseed, plainRows(), tx()
│   └── seed.ts           # full demo dataset + AI knowledge index
├── lib/
│   ├── auth.ts           # scrypt hashing, cookie sessions, requireUser/requireRole
│   ├── api.ts            # route() helper, ApiError, rate limiting
│   ├── crypto.ts         # AES-256-GCM encrypt/decrypt, token hashing
│   ├── attendance.ts     # deterministic % math + 90% eligibility rule
│   ├── certificates.ts   # TN-YYYY-NNNNNN issuance, verify, revoke
│   ├── pronunciation.ts  # Levenshtein word-diff (pure, unit-tested)
│   ├── cms.ts            # homepage sections/pages/FAQ/nav with versioning
│   ├── gamify.ts         # XP, streaks, progress
│   ├── notifications.ts  # in-app notification fan-out
│   ├── search.ts         # global search (courses, lessons, vocab, FAQ, workshops)
│   └── ai/
│       ├── provider.ts   # AIProvider interface
│       ├── openrouter.ts # OpenRouter HTTP provider (server-side key)
│       ├── local.ts      # offline tutor: RAG over platform content, honest fallback
│       ├── knowledge.ts  # chunking → BM25 index → retrieval; reindexAll()
│       ├── reindex.ts    # single-source reindexing
│       └── gateway.ts    # platform key → BYOAI key → local; limits, cache, usage log
└── public/sw.js          # service worker
```

**Data flow.** All business rules live in `src/lib` and are exercised by API route
handlers; pages read SQLite directly for reads and render server components that hand
plain objects to client components (`plainRows()` converts node:sqlite's null-prototype
rows). Mutations always go through `/api/*` with `requireUser()/requireRole()` gates,
so RBAC is enforced in exactly one place per operation.

### AI architecture

```
 question ──▶ gateway.resolveProvider()
               ├─ platform OPENROUTER_API_KEY set?  ──▶ OpenRouter (strong/default models)
               ├─ learner has BYOAI key (AES-GCM encrypted, decrypt on demand)?
               └─ otherwise ──────────────────────────▶ LocalProvider
                                                          ├─ BM25 retrieval over ai_knowledge_chunks
                                                          ├─ vocabulary exact-match lookups
                                                          └─ honest "I couldn't find this on Solai" fallback
```

- Knowledge pipeline: courses/lessons (content blocks → text), vocabulary, workshops,
  FAQ and CMS pages are chunked (~700 chars, 120 overlap) and indexed in
  `ai_knowledge_documents` / `ai_knowledge_chunks`. `reindexAll()` (one click in
  `/admin/ai`) rebuilds everything; editing CMS content marks the source stale and
  reindexes on save.
- The AI never computes eligibility, scores quizzes, or issues certificates — those
  paths are pure deterministic server code (see `attendance.ts`, `certificates.ts`).
- Response cache (24 h), per-day platform limit and per-user daily limit, and every
  request is logged to `ai_usage` (visible in `/admin/ai`).
- The `embedding` column on chunks is reserved for a vector-store upgrade
  (`VECTOR_DATABASE_URL` in `.env.example`); BM25 works today with zero external
  services.

### Attendance & certificates (the 90% rule)

`attendance_percentage = attended_minutes / required_minutes × 100` (capped at 100).
Eligibility is evaluated over **held** sessions only (upcoming sessions can't count
against a learner). A workshop with `certificate_enabled` marks a learner eligible at
≥ 90% — the claim endpoint re-checks this server-side on every request, so an
ineligible learner (e.g. Marco at 55%) always gets `Eligibility requirements not met
(90% rule)`. Certificate IDs are `TN-YYYY-NNNNNN`; `/verify/{id}` is public and shows
name, workshop, attendance %, issue date and validity, with a QR code pointing at the
same page.

---

## Environment variables

Copy `.env.example` → `.env` (or `.env.local`). See the file for full comments.

| Variable | Purpose | Default |
| --- | --- | --- |
| `DATABASE_PATH` | SQLite file location | `./data/solai.db` |
| `AUTH_SECRET` | session signing + key-encryption seed | dev fallback (change in prod!) |
| `NEXT_PUBLIC_APP_URL` | base URL used in QR codes/links | `http://localhost:3000` |
| `OPENROUTER_API_KEY` | platform AI key (server-side only) | unset → local fallback |
| `OPENROUTER_MODEL` / `OPENROUTER_STRONG_MODEL` | model overrides | `openai/gpt-4o-mini` |
| `STORAGE_URL` | optional object storage for uploads | local `./data/uploads` |
| `VECTOR_DATABASE_URL` | reserved for vector-store upgrade | unset |

**Never** commit `.env`, `.env.local`, `data/`, or real keys.

---

## Testing

- **Unit** (`npm test`, 42 tests): pronunciation scoring (Levenshtein/diff bands),
  AES-256-GCM roundtrip + tamper rejection, scrypt password hash/verify, attendance
  math (90% boundary, clamps, held-vs-future sessions, upsert idempotency), and the
  RAG pipeline (chunking/overlap, BM25 ranking, stale handling, reindex replacement,
  removal).
- **End-to-end** (`bash e2e-smoke.sh`, 47 checks against a running server): full
  learner journey (register → lesson → progress → quiz → AI tutor → workshop register
  → check-in/out → certificate claim → verify page → QR), RBAC denial for learners on
  admin APIs, admin user creation + audit trail, AI reindex, live CMS edit visible on
  the homepage, PWA assets, 404 handling.

```bash
npm run build && npm start    # then, in another shell:
bash e2e-smoke.sh
```

---

## Deploying Solai (hosting)

The app is a standard `next build` + `next start` server with **one stateful
requirement: a writable, persistent disk** for the SQLite file and uploads
(`./data`). It also needs **Node.js ≥ 22.5** (`.nvmrc` is pinned — hosts that
honour it pick this up automatically).

Pick a target that gives you a long-running process **and** persistent storage:

### Option A — Railway (easiest)

1. [railway.app](https://railway.app) → **New Project → Deploy from GitHub repo**
   → `djkishore6002-ui/Aurex797` (branch `main` after merging the PR, or deploy
   this branch directly).
2. Add a **Volume** (~1 GB is plenty) and set its mount path to `/data`.
3. Set environment variables:
   ```
   DATABASE_PATH=/data/solai.db
   AUTH_SECRET=<64 random hex chars>        # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   NEXT_PUBLIC_APP_URL=https://<your-app>.up.railway.app
   ```
4. Done — the default Next.js build/start commands are auto-detected. The first
   request seeds the demo data onto the volume (survives restarts).

### Option B — any VPS (Ubuntu/Debian, 2 GB, e.g. Hetzner/DigitalOcean)

```bash
# on the server (Node 22 installed, e.g. via nodesource or nvm)
git clone https://github.com/djkishore6002-ui/Aurex797.git solai && cd solai
npm ci --omit=dev && npm run build
cat > solai.env <<'EOF'
AUTH_SECRET=<64 random hex chars>
NEXT_PUBLIC_APP_URL=https://your-domain.example
EOF
npm start -- -H 0.0.0.0 -p 3000        # or keep it alive:
# npx pm2 start "npx next start -p 3000 -H 0.0.0.0" --name solai --env-file solai.env
```
Put Caddy/Nginx in front for TLS (Caddy does it automatically:
`your-domain.example { reverse_proxy 127.0.0.1:3000 }`).
Backups = copy `data/solai.db` (see "Switching to PostgreSQL" for the scale-up path).

### Option C — Fly.io

`fly launch` (accept defaults, set `NODE_VERSION=22`), attach a volume at
`/data`, set the env vars above (`DATABASE_PATH=/data/solai.db`), then
`fly deploy`.

### What NOT to do: classic serverless (Vercel/Netlify free functions)

Their filesystems are **ephemeral and read-only outside /tmp** — an embedded
SQLite DB would reset on every cold start. On those platforms, follow the
"Switching to PostgreSQL" section first (Neon/Supabase Postgres + S3/Supabase
storage), then deploy as usual.

### Post-deploy checklist

1. Log in with `admin@solai.test` / `admin1234` — **change that password immediately**
   (create your own super admin via `/api/admin/users`, then deactivate the demo account).
2. Open `/admin/ai` → confirm provider settings (add `OPENROUTER_API_KEY` if you
   want cloud LLM answers; the offline tutor works without it).
3. Verify `/verify/TN-2026-000001` shows the valid certificate (checks the public
   URL in QR codes resolves correctly).
4. Check your domain in the homepage header and in `NEXT_PUBLIC_APP_URL`.

---

## Switching to PostgreSQL (optional)

All SQL flows through `src/db` (one connection, one schema file, small query surface).
The data-access layer is deliberately thin: to move to Postgres, replace
`getDb()`'s `node:sqlite` implementation with a pg/pool adapter (parameter style `?`
→ `$n`, `datetime('now')` → `now()`, `AUTOINCREMENT` → sequences), run the translated
schema, and keep everything in `src/lib`/`src/app` unchanged. The BM25 chunk tables
translate 1:1 (optionally add pgvector then — see `VECTOR_DATABASE_URL`).

---

## Honest limitations

- Speaking practice uses the browser's Web Speech API (recognition quality depends on
  the browser/OS); scoring is educational feedback, not medical-grade phonetics.
- Paid workshops have an explicit PENDING state by design — wire a real PSP
  (Razorpay/Stripe) to the registration API when ready; nothing in the UI pretends
  payment happened.
- node:sqlite is marked experimental in Node 22 (stable in Node 23+); pin your Node
  version accordingly.
