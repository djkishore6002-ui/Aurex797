import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

/**
 * Learner check-out. attended_minutes is computed from SERVER timestamps
 * (join_time → now), capped at the session's required minutes.
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { session_id } = (await readJson(req)) as unknown as { session_id: number };
    z.number().int().positive().parse(session_id);
    const db = getDb();

    const row = db.prepare('SELECT * FROM attendance WHERE workshop_session_id = ? AND user_id = ?').get(session_id, user.id) as
      | { id: number; join_time: string | null; required_minutes: number }
      | undefined;
    if (!row?.join_time) throw new ApiError(400, 'Check in first, then check out.');

    const joinMs = new Date(row.join_time.includes('T') ? row.join_time : row.join_time.replace(' ', 'T') + 'Z').getTime();
    const minutes = Math.max(0, (Date.now() - joinMs) / 60_000);
    const attended = Math.min(row.required_minutes * 2, minutes);
    const percentage = row.required_minutes > 0 ? Math.min(100, Math.round((attended / row.required_minutes) * 1000) / 10) : 0;
    const status = percentage >= 90 ? 'present' : attended > 0 ? 'partial' : 'absent';

    db.prepare(
      `UPDATE attendance SET leave_time = datetime('now'), attended_minutes = ?, attendance_percentage = ?, status = ?, source = 'heartbeat', updated_at = datetime('now')
       WHERE id = ?`
    ).run(attended, percentage, status, row.id);

    return json({ ok: true, attended_minutes: Math.round(attended * 10) / 10, percentage, status });
  });
}
