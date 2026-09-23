import { describe, expect, it } from 'vitest';
import { upsertAttendance, workshopAttendanceSummary } from '@/lib/attendance';
import { freshDb } from './helpers';

function addSession(db: ReturnType<typeof freshDb>, workshopId: number, title: string, startsAt: string, required = 60): number {
  const res = db
    .prepare('INSERT INTO workshop_sessions (workshop_id, title, starts_at, duration_minutes, required_minutes) VALUES (?,?,?,?,?)')
    .run(workshopId, title, startsAt, 60, required);
  return Number(res.lastInsertRowid);
}

const PAST_1 = '2026-01-15 10:00:00';
const PAST_2 = '2026-01-16 10:00:00';
const FUTURE = '2030-01-15 10:00:00';

describe('upsertAttendance', () => {
  it('computes percentage, clamps overshoot and sets status', () => {
    const db = freshDb({ foreignKeys: false });
    const s = addSession(db, 1, 'Session 1', PAST_1);

    const r1 = upsertAttendance(db, { workshop_session_id: s, user_id: 1, attended_minutes: 55, source: 'qr' });
    expect(r1.attendance_percentage).toBeCloseTo(91.7, 5);
    expect(r1.status).toBe('present'); // ≥90

    // 90% boundary is inclusive
    const r2 = upsertAttendance(db, { workshop_session_id: s, user_id: 2, attended_minutes: 54, source: 'qr' });
    expect(r2.attendance_percentage).toBe(90);
    expect(r2.status).toBe('present');

    const r3 = upsertAttendance(db, { workshop_session_id: s, user_id: 3, attended_minutes: 30, source: 'manual' });
    expect(r3.status).toBe('partial');

    const r4 = upsertAttendance(db, { workshop_session_id: s, user_id: 4, attended_minutes: 0, source: 'organizer' });
    expect(r4.status).toBe('absent');
    expect(r4.attendance_percentage).toBe(0);

    // 1000 minutes attended clamps to 2× required, percentage caps at 100
    const r5 = upsertAttendance(db, { workshop_session_id: s, user_id: 5, attended_minutes: 1000, source: 'manual' });
    expect(r5.attended_minutes).toBe(120);
    expect(r5.attendance_percentage).toBe(100);
  });

  it('upserts (updates on conflict, never duplicates)', () => {
    const db = freshDb({ foreignKeys: false });
    const s = addSession(db, 1, 'Session 1', PAST_1);
    upsertAttendance(db, { workshop_session_id: s, user_id: 1, attended_minutes: 30, source: 'qr' });
    const row = upsertAttendance(db, { workshop_session_id: s, user_id: 1, attended_minutes: 60, source: 'manual' });
    expect(row.attended_minutes).toBe(60);
    expect(row.source).toBe('manual');
    const count = db.prepare('SELECT COUNT(*) c FROM attendance').get() as unknown as { c: number };
    expect(count.c).toBe(1);
  });

  it('throws for unknown sessions', () => {
    const db = freshDb({ foreignKeys: false });
    expect(() => upsertAttendance(db, { workshop_session_id: 999, user_id: 1, attended_minutes: 1, source: 'qr' })).toThrow('Session not found');
  });
});

describe('workshopAttendanceSummary (the 90% certificate rule)', () => {
  it('marks a learner eligible at ≥ 90% of held minutes', () => {
    const db = freshDb({ foreignKeys: false });
    const s1 = addSession(db, 1, 'S1', PAST_1);
    const s2 = addSession(db, 1, 'S2', PAST_2);
    upsertAttendance(db, { workshop_session_id: s1, user_id: 10, attended_minutes: 58, source: 'qr' });
    upsertAttendance(db, { workshop_session_id: s2, user_id: 10, attended_minutes: 55, source: 'qr' });

    const sum = workshopAttendanceSummary(db, 1, 10);
    expect(sum.totalRequiredMinutes).toBe(120);
    expect(sum.totalAttendedMinutes).toBe(113);
    expect(sum.percentage).toBe(94.2);
    expect(sum.eligible).toBe(true);
  });

  it('marks a learner ineligible below 90%', () => {
    const db = freshDb({ foreignKeys: false });
    const s1 = addSession(db, 1, 'S1', PAST_1);
    const s2 = addSession(db, 1, 'S2', PAST_2);
    upsertAttendance(db, { workshop_session_id: s1, user_id: 11, attended_minutes: 55, source: 'qr' });
    upsertAttendance(db, { workshop_session_id: s2, user_id: 11, attended_minutes: 40, source: 'qr' });

    const sum = workshopAttendanceSummary(db, 1, 11);
    expect(sum.percentage).toBe(79.2); // 95/120
    expect(sum.eligible).toBe(false);
  });

  it('ignores upcoming (not-yet-held) sessions entirely', () => {
    const db = freshDb({ foreignKeys: false });
    const s1 = addSession(db, 1, 'S1 held', PAST_1);
    const s2 = addSession(db, 1, 'S2 future', FUTURE);
    upsertAttendance(db, { workshop_session_id: s1, user_id: 12, attended_minutes: 30, source: 'qr' });

    const sum = workshopAttendanceSummary(db, 1, 12);
    expect(sum.totalRequiredMinutes).toBe(60); // only the held session counts
    expect(sum.percentage).toBe(50);
    expect(sum.eligible).toBe(false);
  });

  it('returns 0% and ineligible for a learner with no attendance', () => {
    const db = freshDb({ foreignKeys: false });
    addSession(db, 1, 'S1', PAST_1);
    const sum = workshopAttendanceSummary(db, 1, 99);
    expect(sum.percentage).toBe(0);
    expect(sum.eligible).toBe(false);
  });
});
