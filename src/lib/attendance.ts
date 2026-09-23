import type { DB } from '@/db';

/*
 * ATTENDANCE — deterministic server-side rules.
 * attendance_percentage = (attended_minutes / required_minutes) × 100, capped at 100.
 * The 90% certificate threshold is enforced here and in certificates.ts —
 * NEVER by the AI.
 */

export interface AttendanceRow {
  id: number;
  workshop_session_id: number;
  user_id: number;
  join_time: string | null;
  leave_time: string | null;
  attended_minutes: number;
  required_minutes: number;
  attendance_percentage: number;
  status: 'present' | 'partial' | 'absent' | 'excused';
  source: string;
}

export function upsertAttendance(
  db: DB,
  input: { workshop_session_id: number; user_id: number; attended_minutes: number; source: string; recorded_by?: number | null; join_time?: string | null; leave_time?: string | null }
): AttendanceRow {
  const session = db.prepare('SELECT * FROM workshop_sessions WHERE id = ?').get(input.workshop_session_id) as unknown as { required_minutes: number } | undefined;
  if (!session) throw new Error('Session not found');
  const required = session.required_minutes;
  const attended = Math.max(0, Math.min(input.attended_minutes, required * 2)); // sanity clamp
  const percentage = required > 0 ? Math.min(100, Math.round((attended / required) * 1000) / 10) : 0;
  const status: AttendanceRow['status'] = percentage >= 90 ? 'present' : attended > 0 ? 'partial' : 'absent';
  db.prepare(
    `INSERT INTO attendance (workshop_session_id, user_id, join_time, leave_time, attended_minutes, required_minutes, attendance_percentage, status, source, recorded_by)
     VALUES (?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(workshop_session_id, user_id) DO UPDATE SET
       join_time = COALESCE(excluded.join_time, attendance.join_time),
       leave_time = COALESCE(excluded.leave_time, attendance.leave_time),
       attended_minutes = excluded.attended_minutes,
       required_minutes = excluded.required_minutes,
       attendance_percentage = excluded.attendance_percentage,
       status = excluded.status,
       source = excluded.source,
       recorded_by = excluded.recorded_by,
       updated_at = datetime('now')`
  ).run(input.workshop_session_id, input.user_id, input.join_time ?? null, input.leave_time ?? null, attended, required, percentage, status, input.source, input.recorded_by ?? null);
  return db.prepare('SELECT * FROM attendance WHERE workshop_session_id = ? AND user_id = ?').get(input.workshop_session_id, input.user_id) as unknown as unknown as AttendanceRow;
}

export interface WorkshopAttendanceSummary {
  totalRequiredMinutes: number;
  totalAttendedMinutes: number;
  percentage: number;
  eligible: boolean; // >= 90 — deterministic rule
  sessions: (AttendanceRow & { session_title: string; starts_at: string })[];
}

export function workshopAttendanceSummary(db: DB, workshopId: number, userId: number): WorkshopAttendanceSummary {
  // Eligibility is computed over HELD sessions only — upcoming sessions cannot
  // count against a learner before they happen. Once every session is in the
  // past this equals the full-workshop percentage from the spec.
  const nowIso = new Date().toISOString();
  const sessions = db
    .prepare('SELECT * FROM workshop_sessions WHERE workshop_id = ? AND starts_at <= ? ORDER BY starts_at')
    .all(workshopId, nowIso) as unknown as { id: number; title: string; starts_at: string; required_minutes: number }[];
  const rows = db
    .prepare(
      `SELECT a.*, s.title AS session_title, s.starts_at
       FROM attendance a JOIN workshop_sessions s ON s.id = a.workshop_session_id
       WHERE s.workshop_id = ? AND a.user_id = ? ORDER BY s.starts_at`
    )
    .all(workshopId, userId) as unknown as unknown as (AttendanceRow & { session_title: string; starts_at: string })[];
  const totalRequired = sessions.reduce((a, s) => a + s.required_minutes, 0);
  const totalAttended = rows.reduce((a, r) => a + r.attended_minutes, 0);
  const percentage = totalRequired > 0 ? Math.min(100, Math.round((totalAttended / totalRequired) * 1000) / 10) : 0;
  return {
    totalRequiredMinutes: totalRequired,
    totalAttendedMinutes: totalAttended,
    percentage,
    eligible: percentage >= 90,
    sessions: rows,
  };
}
