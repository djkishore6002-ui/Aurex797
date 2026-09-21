# Database Schema

All tables are created in `services/api/src/db/index.ts` on startup (idempotent migrations). Foreign keys and WAL journal are enabled.

## Tables

- **users** — id, email (unique), password_hash, name, role, avatar_url, email_verified, banned, timestamps.
- **profiles** (1:1 users) — native_language, learning_goal, level, xp, streak_days, last_active_date, daily_goal_minutes, bio.
- **courses** — title (en+ta), description, thumbnail, level, explanation_language, instructor_id, category, duration_minutes, published, enrollment_count, rating.
- **course_modules** — course_id, title, sort_order.
- **lessons** — module_id, course_id, title, type (video|vocabulary|grammar|scenario|reading|quiz), duration_seconds, sort_order, video_url, transcript, content_json, published.
- **vocabularies** — lesson_id, category, tamil, transliteration, meaning, meaning_lang, audio_url, difficulty, example.
- **enrollments** — user_id × course_id (unique), progress_percent, completed.
- **lesson_progress** — user_id × lesson_id (unique), last_position_seconds, watched_seconds, completion_percent, completed, updated_at.
- **quizzes / quiz_questions / quiz_attempts** — Multiple-choice quizzes with idempotent attempts (keyed by client id).
- **workshops** — title, description, instructor_id, organizer_id, meeting_url, capacity, is_paid, price, published.
- **workshop_sessions** — workshop_id, start_time, end_time, duration_minutes, required_minutes (≥90% threshold).
- **registrations** — user_id × workshop_id (unique), checked_in, payment_status.
- **attendance** — user_id × session_id (unique), join_time, leave_time, duration_minutes, status (present|partial|absent).
- **certificates** — unique cert_number, user_id, workshop_id/course_id, title, issuer, attendance_percent, issued_at, qr_data, revoked.
- **questions** — user_id, lesson_id, course_id, workshop_id, body, image_url, audio_url, status(pending|ai_answered|teacher_reviewed|resolved), ai_answer, teacher_answer, answered_by.
- **announcements** — author_id, scope(global|course|workshop), scope_id, title, body.
- **notifications** — user_id, type, title, body, link, read.
- **communities / community_members / posts / comments** — Standard community model.
- **ai_conversations** — user_id, role(user|assistant), content, context.
- **ai_provider_settings** — user_id, mode(platform|byoai), provider, encrypted_key (AES-256), model.
- **offline_sync_events** — user_id, event_type, payload, idempotency_key (unique per user+type), synced.

## Key Indexes

- `lessons(course_id)`, `lesson_progress(user_id)`, `enrollments(user_id)`, `vocabularies(lesson_id)`, `notifications(user_id, read)`, `questions(status)`, `courses(published, level)`, `workshops(published)`.
- Unique composite indexes on `attendance(user_id, session_id)`, `enrollments(user_id, course_id)`, `registrations(user_id, workshop_id)`, `offline_sync_events(user_id, event_type, idempotency_key)`.

## Portability to PostgreSQL

All SQL used is standard (SQLite `datetime('now')` calls can be swapped to `NOW()` and booleans are already stored as 0/1 in SQLite for easy migration). The schema is ready for Supabase.
