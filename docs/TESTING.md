# Testing

## Unit tests

Run all tests:

```bash
npm test
```

Coverage includes the critical business rules:

1. **90% certificate eligibility** — certificates are never issued below 90% of required minutes.
2. **Attendance calculation** — rounds to 1 decimal, based on `required_minutes` (not `duration_minutes`).
3. **Attendance cap** — attendance percentage is clamped at 100%.
4. **Certificate issuance idempotency** — running the eligibility check multiple times doesn't duplicate certificates.
5. **Deterministic results** — no AI input affects certificate decisions.

Tests live in `services/api/src/**/*.test.ts` and run with Node's built-in test runner (`--test`).

## API tests (curl / manual)

```bash
# login admin
curl -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@aurex.local","password":"admin123"}'

# admin creates an organizer
curl -X POST http://localhost:4000/api/admin/users -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"email":"o@test.com","password":"pass12345","name":"New Org","role":"organizer"}'

# public certificate verification (no auth)
curl http://localhost:4000/api/certificates/verify/AURX-XXXXXX
```

## UI / E2E flow

See `docs/DEMO.md` for the complete click-through journey that exercises admin, organizer, learner, AI, workshop, attendance, and certificate flows end-to-end.

## Smoke checks performed during build

- `/api/health` returns 200.
- Login/logic/register works for all three demo accounts.
- Organizer can create a course/module/lesson and publish.
- Learner can enroll, complete a lesson (heartbeat → 100% progress, +20 XP, streak update).
- AI chat responds.
- Question creation + teacher response updates status.
- Workshop creation and registration works.
- Certificate verification endpoint returns `valid:true` for seeded certs.
