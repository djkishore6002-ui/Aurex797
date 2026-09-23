import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { Badge, EmptyState, PageHead } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Workshops' };

export default function WorkshopsPage() {
  const db = getDb();
  const workshops = db
    .prepare(
      `SELECT w.*, u.name AS instructor_name,
        (SELECT COUNT(*) FROM workshop_registrations r WHERE r.workshop_id = w.id AND r.status IN ('CONFIRMED','PAID')) AS seats,
        (SELECT COUNT(*) FROM workshop_sessions s WHERE s.workshop_id = w.id) AS session_count
       FROM workshops w LEFT JOIN users u ON u.id = w.instructor_id
       WHERE w.is_published = 1 AND w.deleted_at IS NULL
       ORDER BY w.starts_at`
    )
    .all() as unknown as {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    instructor_name: string | null;
    starts_at: string;
    duration_minutes: number;
    capacity: number;
    price_cents: number;
    certificate_enabled: number;
    registration_deadline: string | null;
    seats: number;
    session_count: number;
  }[];

  const upcoming = workshops.filter((w) => new Date(w.starts_at).getTime() > Date.now());
  const past = workshops.filter((w) => new Date(w.starts_at).getTime() <= Date.now());

  return (
    <div className="container-page py-10">
      <PageHead title="Live workshops" subtitle="Register, attend and earn a verifiable certificate at 90% attendance. Attendance is recorded with server timestamps — never faked." />
      <h2 className="mb-4 text-lg font-bold text-ink-900">Upcoming</h2>
      {upcoming.length === 0 ? (
        <EmptyState icon="🎤" title="No upcoming workshops" body="The organizer schedules new workshops from the admin dashboard." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {upcoming.map((w) => (
            <Link key={w.id} href={`/workshops/${w.slug}`} className="card flex flex-col p-5 transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-ink-950">{w.title}</h3>
                <Badge tone={w.price_cents > 0 ? 'warning' : 'success'}>{w.price_cents > 0 ? `₹${w.price_cents / 100}` : 'Free'}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{w.description}</p>
              <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-xs text-ink-500">
                <span>📅 {fmtDateTime(w.starts_at)}</span>
                <span>⏱️ {w.duration_minutes} min × {w.session_count} sessions</span>
                <span>👥 {w.seats}/{w.capacity}</span>
                {w.certificate_enabled && <span>🎓 Certificate</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-12 mb-4 text-lg font-bold text-ink-900">Past workshops</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {past.map((w) => (
              <Link key={w.id} href={`/workshops/${w.slug}`} className="card flex flex-col p-5 opacity-70 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-ink-950">{w.title}</h3>
                  <Badge>Completed</Badge>
                </div>
                <p className="mt-auto pt-4 text-xs text-ink-500">📅 {fmtDateTime(w.starts_at)} · {w.seats} participants</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
