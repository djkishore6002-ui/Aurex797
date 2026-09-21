# Demo Walkthrough

Start the app:

```bash
npm install
cp .env.example .env
npm run seed
npm run build
npm start
```

Open http://localhost:4000.

## 1. Landing
- Hero shows the brand (orange/purple Tamil "த" logo) and value props.
- "Get started free" → Register.

## 2. Learner signup → Onboarding
- Register a new account. You'll be dropped into onboarding (goal → level → native language).
- Pick "Travel" → "Absolute Beginner" → "English" (any combo works).

## 3. Dashboard (Learner)
- Streak / XP / Words / Lessons stat cards.
- "Continue Learning" shows the next lesson (or an empty-state if no enrollments yet).
- "Recommended courses" shows 5 real seeded courses: Tamil from Zero, Spoken Tamil, Tamil for Travelers, Everyday Tamil, Reading & Writing.

## 4. Take a course
- Open "Tamil from Zero" → Enroll (free) → Click first lesson "Uyir Ezhuthukal".
- The video player loads (sample public MP4); play it. Every 5 seconds a heartbeat updates progress. Completing ≥90% awards +20 XP, updates streak, refreshes enrollment progress, and posts a notification.
- Switch tabs: **Vocab** shows real Tamil words (vowels, consonants, greetings, numbers). **Quiz** has 3 MCQs — submit to see score and explanations.
- Click "Download for offline" → lesson appears on the Downloads page.

## 5. AI Tutor
- Go to AI tab. Send "Thank you in Tamil" → AI responds with நன்றி / Nanri / meaning.
- Ask for a quiz — AI replies with sample questions.
- AI Settings: toggle BYOAI, paste an OpenRouter key (optional), test connection.

## 6. Speaking
- Go to Speaking (🎤). Tap the mic, say "வணக்கம்" (or "Vanakkam"). Heuristic similarity scoring returns score + feedback, with a clear disclaimer that this is an approximation.

## 7. Workshops
- Register for "Speak Tamil in 7 Days — Intensive Bootcamp". See sessions, meeting link.
- For live sessions (future), click "Join live" → check-in starts a timer; "Leave & save" writes attendance.
- Observe the attendance bar & eligibility status ("Needs X% more" or "✓ Certificate eligible").

## 8. Certificates
- Login with `learner@aurex.local / learner123` — this demo learner has 100% attendance on the bootcamp workshop and an issued certificate.
- Certificates page shows it with QR. Public verification URL: `/verify/AURX-XXXX` shows VALID CERTIFICATE with all data + QR.

## 9. Ask teacher question
- From any lesson, type a question in the right panel → AI answers instantly; it appears in the organizer's Questions list.

## 10. Organizer flow
- Logout → `organizer@aurex.local / organizer123`.
- Dashboard: 5-segment stats, quick actions, pending questions.
- Courses: you see your 5 seeded courses; click "Courses → New" to build one (add modules, lessons, vocab) and publish.
- Workshops: create a new workshop with future date, Google Meet/Zoom link.
- Questions: filter by status, see AI answers, write teacher reply; mark resolved.
- Announcements: post a global announcement (optionally notifies all users).
- Attendance (click "Attendance" on a workshop): roster with per-user % and eligibility. "Issue certificates" issues for all ≥90%.

## 11. Admin flow
- Logout → `admin@aurex.local / admin123`.
- Dashboard: 6 stat cards (users, organizers, courses, workshops, enrollments, certificates).
- Users: list all users; create organizers/admins; suspend/unsuspend.

## 12. Community
- Learner can join communities, create posts, comment.

## 13. Offline
- Open Downloads page to see downloaded lessons. When the browser is offline, progress/quiz attempts enqueue locally and sync on reconnect (idempotent).

## 14. Verification
- Copy a certificate number from the Certificates page, open `http://localhost:4000/verify/<number>` in an incognito window. The page returns VALID CERTIFICATE with name, title, issuer, attendance, date, QR — no login required.
