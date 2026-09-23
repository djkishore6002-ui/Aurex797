import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

/**
 * Learner check-in for a workshop session.
 * Requires an active registration; join_time uses the SERVER timestamp.
 * (Heartbeat mechanism — organizers can also record attendance manually.)
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { session_id } = (await readJson(req)) as unknown as { session_id: number };
    z.number().int().positive().parse(session_id);
    const db = getDb();

    const session = db
      .prepare('SELECT s.id, s.workshop_id, s.required_minutes, s.starts_at, w.title FROM workshop_sessions s JOIN workshops w ON w.id = s.workshop_id WHERE s.id = ?')
      .get(session_id) as unknown as { id: number; workshop_id: number; required_minutes: number; title: string; starts_at: string } | undefined;
    if (!session) throw new ApiError(404, 'Session not found');

    const reg = db.prepare('SELECT id, status FROM workshop_registrations WHERE user_id = ? AND workshop_id = ?').get(user.id, session.workshop_id) as unknown as { status: string } | undefined;
    if (!reg || !['CONFIRMED', 'PAID'].includes(reg.status)) throw new ApiError(403, 'You are not registered for this workshop.');

    const existing = db.prepare('SELECT join_time FROM attendance WHERE workshop_session_id = ? AND user_id = ?').get(session_id, user.id) as unknown as { join_time: string | null } | undefined;
    if (existing?.join_time) return json({ ok: true, already: true, join_time: existing.join_time });

    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO attendance (workshop_session_id, user_id, join_time, attended_minutes, required_minutes, attendance_percentage, status, source)
       VALUES (?,?,?,0,?,0,'absent','heartbeat')`
    ).run(session_id, user.id, now, session.required_minutes);
    return json({ ok: true, join_time: now });
  });
}
