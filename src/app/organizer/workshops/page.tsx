import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHead } from '@/components/ui';
import { AttendanceAdmin } from './attendance-admin';

export const dynamic = 'force-dynamic';

export default function OrganizerWorkshopsPage() {
  const user = getCurrentUser()!;
  const db = getDb();
  const workshops = db
    .prepare(
      `SELECT w.id, w.slug, w.title, w.starts_at, w.capacity,
        s.id AS session_id, s.title AS session_title, s.starts_at AS session_starts, s.duration_minutes, s.required_minutes
       FROM workshops w
       LEFT JOIN workshop_sessions s ON s.workshop_id = w.id
       WHERE w.deleted_at IS NULL AND (w.instructor_id = ? OR w.organizer_id = ?)
       ORDER BY w.starts_at, s.starts_at`
    )
    .all(user.id, user.id) as unknown as { id: number; slug: string; title: string; session_id: number | null; session_title: string | null; session_starts: string | null; duration_minutes: number; required_minutes: number }[];

  const byWorkshop = new Map<number, typeof workshops>();
  for (const w of workshops) {
    byWorkshop.set(w.id, [...(byWorkshop.get(w.id) ?? []), w]);
  }

  return (
    <div>
      <PageHead title="Workshops & attendance" subtitle="Record organizer-confirmed attendance per session. The 90% rule is applied deterministically — these minutes are what certificates are based on." />
      <AttendanceAdmin
        workshops={[...byWorkshop.entries()].map(([id, rows]) => ({
          id,
          slug: rows[0].slug,
          title: rows[0].title,
          sessions: rows.filter((r) => r.session_id != null).map((r) => ({ id: r.session_id as number, title: r.session_title ?? 'Session', starts_at: r.session_starts ?? '', required_minutes: r.required_minutes })),
        }))}
      />
    </div>
  );
}
