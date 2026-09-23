import { getDb } from '@/db';
import { PageHead } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';
import { WorkshopsAdmin } from './workshops-admin';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminWorkshopsPage() {
  const db = getDb();
  const workshops = db
    .prepare(
      `SELECT w.id, w.slug, w.title, w.description,
        u.name AS instructor_name2, w.starts_at, w.duration_minutes, w.capacity, w.meeting_url, w.price_cents,
        w.registration_deadline, w.certificate_enabled, w.is_published,
        (SELECT COUNT(*) FROM workshop_registrations r WHERE r.workshop_id = w.id AND r.status IN ('CONFIRMED','PAID')) AS seats,
        (SELECT COUNT(*) FROM workshop_sessions s WHERE s.workshop_id = w.id) AS sessions_count
       FROM workshops w LEFT JOIN users u ON u.id = w.instructor_id
       WHERE w.deleted_at IS NULL ORDER BY w.starts_at DESC`
    )
    .all() as unknown as {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    starts_at: string;
    duration_minutes: number;
    capacity: number;
    meeting_url: string | null;
    price_cents: number;
    registration_deadline: string | null;
    certificate_enabled: number;
    is_published: number;
    seats: number;
    sessions_count: number;
    instructor_name2: string | null;
  }[];

  return (
    <div>
      <PageHead title="Workshops" subtitle="Create workshops with sessions, manage registrations and attendance. The 90% certificate rule is applied automatically." />
      <WorkshopsAdmin
        workshops={workshops.map((w) => ({ ...w, instructor_name: w.instructor_name2 }))}
        now={fmtDateTime(new Date().toISOString())}
      />
    </div>
  );
}
