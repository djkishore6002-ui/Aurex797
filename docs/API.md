# API Reference

All endpoints return `{ success: true, data: … }` or `{ success: false, error: { code, message } }`. Auth is via `Authorization: Bearer <JWT>`.

## Auth
- `POST /api/auth/register` `{email,password,name,role?}`
- `POST /api/auth/login` `{email,password}` → `{token,user}`
- `GET /api/auth/me` → user+profile
- `PATCH /api/auth/me` → update name/bio/native_language/learning_goal/level/daily_goal
- `POST /api/auth/logout` (stateless; client drops token)

## Courses
- `GET /api/courses?level&category&q&page&per_page`
- `GET /api/courses/search/all?q=` — search across courses/lessons/workshops/vocab
- `POST /api/courses` (organizer+)
- `GET /api/courses/:id`
- `POST /api/courses/:id/publish` (organizer+)
- `POST /api/courses/:id/modules` (organizer+)
- `POST /api/courses/:id/lessons` (organizer+)
- `GET /api/courses/lessons/:id` (auth) — lesson detail with vocab, quiz, progress
- `POST /api/courses/lessons/:id/progress` `{last_position_seconds,watched_seconds,duration_seconds}` → tracks completion, awards XP, updates streak/enrollment progress
- `POST /api/courses/lessons/:id/quiz/submit` `{answers:[…],idempotency_key}`
- `POST /api/courses/lessons/:id/vocab` (organizer+)
- `GET /api/courses/vocab/list?category&difficulty`
- `POST /api/courses/:id/enroll`
- `GET /api/courses/my/enrollments`
- `GET /api/courses/continue/learning`
- `GET /api/courses/stats/me`

## Workshops
- `GET /api/workshops?q`
- `POST /api/workshops` (organizer+) `{title,description,meeting_url,capacity,start_time,duration_minutes}`
- `GET /api/workshops/:id`
- `POST /api/workshops/:id/register`
- `GET /api/workshops/my/registrations`
- `POST /api/workshops/sessions/:sid/checkin`
- `POST /api/workshops/sessions/:sid/leave` — computes duration, awards XP, auto-issues cert if ≥90%
- `GET /api/workshops/:id/attendance` (organizer+)
- `POST /api/workshops/:id/certificates/generate` (organizer+)
- `GET /api/workshops/:id/my-attendance` — includes eligibility boolean

## AI
- `POST /api/ai/chat` `{message,context?}`
- `GET /api/ai/history`
- `GET /api/ai/settings`
- `POST /api/ai/settings` `{mode,api_key?,model?}` — saves AES-encrypted key
- `POST /api/ai/test-connection`
- `POST /api/ai/generate-quiz/:lessonId`

## Questions
- `POST /api/questions` `{body,lesson_id?,course_id?,workshop_id?}` — auto-AI answers
- `GET /api/questions?status&mine=1`
- `GET /api/questions/:id`
- `POST /api/questions/:id/respond` (organizer+) `{answer,action}`
- `GET /api/questions/stats/overview` (organizer+)

## Community
- `GET /api/community`
- `POST /api/community` (organizer+)
- `POST /api/community/:id/join`
- `GET /api/community/:id/posts`
- `POST /api/community/:id/posts`
- `GET /api/community/posts/:pid/comments`
- `POST /api/community/posts/:pid/comments`

## Announcements & Notifications
- `GET /api/announcements?scope=global&scope_id?`
- `POST /api/announcements` (organizer+)
- `GET /api/notifications/mine`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`

## Speaking
- `GET /api/speaking/prompts`
- `POST /api/speaking/analyze` `{expected,transcript}` → similarity score, missing words, feedback + disclaimer

## Certificates (public)
- `GET /api/certificates/mine`
- `GET /api/certificates/verify/:number` (public — no auth required)

## Admin (/api/admin/* admin-only)
- `GET /api/admin/stats`
- `GET /api/admin/users?role&q`
- `POST /api/admin/users`
- `POST /api/admin/users/:id/ban|unban`

## Organizer
- `GET /api/organizer/stats` (organizer+)

## Sync
- `POST /api/sync` `{events:[{event_type,payload,idempotency_key}]}`
