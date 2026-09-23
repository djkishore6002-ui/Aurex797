import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole, isStaff } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { upsertAttendance } from '@/lib/attendance';

/**
 * Attendance management.
 * GET:  list attendance rows for a workshop session (staff of the workshop)
 * POST: record/adjust attendance minutes (organizer confirmation — the
 *       legitimate "manual correction" mechanism from the spec).
 */
export async function GET(req: Request) {
  return route(async () => {
    const me = requireRole('super_admin', 'organizer', 'teacher');
    const params = new URL(req.url).searchParams;
    const sessionId = Number(params.get('session_id') ?? 0);
    const workshopId = Number(params.get('workshop_id') ?? 0);
    if (!sessionId && !workshopId) throw new ApiError(400, 'session_id or workshop_id required');
    const db = getDb();

    if (sessionId) {
      assertWorkshopAccess(db, me, (db.prepare('SELECT workshop_id FROM workshop_sessions WHERE id = ?').get(sessionId) as unknown as { workshop_id: number })?.workshop_id ?? -1);
    } else {
      assertWorkshopAccess(db, me, workshopId);
    }
    const rows = db
      .prepare(
        `SELECT a.*, u.name, u.email, s.title AS session_title, s.starts_at
         FROM attendance a
         JOIN users u ON u.id = a.user_id
         JOIN workshop_sessions s ON s.id = a.workshop_session_id
         WHERE ${sessionId ? 'a.workshop_session_id = ?' : 's.workshop_id = ?'}
         ORDER BY u.name`
      )
      .all(sessionId || workshopId);
    const registrants = db
      .prepare(
        `SELECT r.user_id, u.name, u.email, r.status AS reg_status, a.attended_minutes, a.status AS att_status, a.id AS attendance_id
         FROM workshop_registrations r
         JOIN users u ON u.id = r.user_id
         LEFT JOIN workshop_sessions s ON ${sessionId ? `s.id = ?` : `s.workshop_id = ?`}
         LEFT JOIN attendance a ON a.workshop_session_id = s.id AND a.user_id = r.user_id
         WHERE ${sessionId ? 'r.workshop_id = (SELECT workshop_id FROM workshop_sessions WHERE id = ?)' : 'r.workshop_id = ?'}
         ORDER BY u.name`
      )
      .all(...(sessionId ? [sessionId, sessionId] : [workshopId, workshopId]));
    return json({ rows, registrants });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const me = requireRole('super_admin', 'organizer');
    const body = (await readJson(req)) as unknown as { session_id: number; user_id: number; attended_minutes: number; source?: string };
    const sessionId = z.number().int().positive().parse(body.session_id);
    const userId = z.number().int().positive().parse(body.user_id);
    const minutes = z.number().min(0).max(1440).parse(body.attended_minutes);
    const db = getDb();
    const session = db.prepare('SELECT workshop_id FROM workshop_sessions WHERE id = ?').get(sessionId) as unknown as { workshop_id: number } | undefined;
    if (!session) throw new ApiError(404, 'Session not found');
    assertWorkshopAccess(db, me, session.workshop_id);

    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId) as unknown as { id: number; name: string } | undefined;
    if (!user) throw new ApiError(404, 'User not found');

    const row = upsertAttendance(db, { workshop_session_id: sessionId, user_id: userId, attended_minutes: minutes, source: 'organizer', recorded_by: me.id });
    audit(me, 'ORGANIZER_RECORDED_ATTENDANCE', { entity: 'attendance', entity_id: row.id, next: { user: user.name, session_id: sessionId, attended_minutes: minutes, source: 'organizer' } });
    return json({ ok: true, attendance: row });
  });
}

function assertWorkshopAccess(db: ReturnType<typeof getDb>, me: { id: number; role: string }, workshopId: number) {
  if (me.role === 'super_admin') return;
  const w = db.prepare('SELECT instructor_id, organizer_id FROM workshops WHERE id = ?').get(workshopId) as unknown as { instructor_id: number | null; organizer_id: number | null } | undefined;
  if (!w) throw new ApiError(404, 'Workshop not found');
  if (w.instructor_id !== me.id && w.organizer_id !== me.id) throw new ApiError(403, 'You do not manage this workshop');
  void isStaff;
}
