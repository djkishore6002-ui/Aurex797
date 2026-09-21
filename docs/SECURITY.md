# Security

## Authentication
- Passwords hashed with bcrypt (cost factor 10).
- Stateless JWT signed with HS256 using `JWT_SECRET` (change in production).
- Tokens are never logged; logout is client-side discard with short 7-day expiry.

## Authorization (RBAC)
- Three roles: `admin`, `organizer`, `learner`.
- Every protected endpoint uses server-side middleware (`authRequired`, `requireRole(...)`).
- The role in the JWT payload is always validated; frontend role is never trusted.
- Organizers can only manage courses/workshops they own unless they are admin.
- Enrollment/registration/certification endpoints all check ownership server-side.

## Input Validation
- All POST/PATCH bodies validated with Zod schemas (length, types, regex).
- Malformed input returns 400 with a structured error code.

## Transport & Headers
- Helmet sets standard CSP, HSTS (when behind TLS), X-Content-Type-Options, frame blocking, etc.
- CORS allows any origin in dev; restrict in production via reverse proxy / CORS_ORIGIN if you add it.
- Rate limit: 200 requests/minute per IP.

## Data & Secrets
- No secrets are hard-coded; all keys come from environment variables.
- Platform API keys never leave the server.
- BYOAI keys are encrypted with AES-256-CBC before storage (key derived via SHA-256 of JWT_SECRET). For production-grade isolation, replace this with a KMS (AWS/GCP) or per-user keystore.
- Stack traces never reach the client — a generic "Something went wrong. Please try again." is returned; technical errors are logged server-side.

## SQL Safety
- All database access is parameterized through the SQLite driver — no string concatenation into SQL.
- Foreign keys enforced via `PRAGMA foreign_keys = ON`.

## Uploads
- Placeholder multer setup accepts file uploads with size limits; in production lock to MIME types (images/audio/video) and store in S3/Supabase Storage rather than the local disk.

## Privacy
- AI requests only include the current context (lesson_id, level, native language, message) — no private profile/history bulk is sent.
- AI system prompt forbids revealing other users' data and restricts scope to Tamil education.
- Account deletion: can be added as an endpoint that removes `users WHERE id=?` (FK cascades delete all related data).
- The app ships a clear note: AI can make mistakes; certificates are deterministic and not decided by AI.

## Known hardening (production checklist)
- [ ] Rotate JWT_SECRET to 64+ char random.
- [ ] Enable TLS via reverse proxy.
- [ ] Restrict CORS to your public domain.
- [ ] Use S3/Supabase Storage with signed URLs for uploads.
- [ ] Replace SQLite with Postgres + regular backups.
- [ ] Add refresh-token rotation and server-side session invalidation.
- [ ] Add email verification & password reset (hooks are in place for email_verified flag).
- [ ] Add CSRF tokens if you enable cookie-based sessions (not needed for JWT auth).
