import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb, plainRows } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { workshopAttendanceSummary } from '@/lib/attendance';
import { fmtDateTime } from '@/lib/utils';
import { Badge, PageHead } from '@/components/ui';
import { TutorContextBridge } from '@/components/TutorContextBridge';
import { RegisterAttend } from './register-attend';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

/** Static snapshot (GitHub Pages): prerender every published workshop. */
export function generateStaticParams() {
  const db = getDb();
  const rows = db
    .prepare('SELECT slug FROM workshops WHERE is_published = 1 AND deleted_at IS NULL')
    .all() as unknown as { slug: string }[];
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const db = getDb();
  const w = db.prepare('SELECT title FROM workshops WHERE slug = ? AND is_published = 1 AND deleted_at IS NULL').get(params.slug) as unknown as { title: string } | undefined;
  return { title: w?.title ?? 'Workshop not found' };
}

export default function WorkshopPage({ params }: { params: { slug: string } }) {
  const db = getDb();
  const workshop = db
    .prepare('SELECT w.*, u.name AS instructor_name FROM workshops w LEFT JOIN users u ON u.id = w.instructor_id WHERE w.slug = ? AND w.deleted_at IS NULL')
    .get(params.slug) as
    | (Record<string, unknown> & { id: number; title: string; description: string | null; instructor_name: string | null; starts_at: string; duration_minutes: number; capacity: number; meeting_url: string | null; price_cents: number; registration_deadline: string | null; certificate_enabled: number; is_published: number })
    | undefined;
  if (!workshop || !workshop.is_published) notFound();

  const user = getCurrentUser();
  const reg = user
    ? (db.prepare('SELECT status FROM workshop_registrations WHERE user_id = ? AND workshop_id = ?').get(user.id, workshop.id) as unknown as { status: string } | null)
    : null;

  const sessions = plainRows<{ id: number; title: string; starts_at: string; duration_minutes: number; required_minutes: number; my_attendance: number | null; my_join: string | null }>(
    db
      .prepare(
        `SELECT s.id, s.title, s.starts_at, s.duration_minutes, s.required_minutes,
          a.attended_minutes AS my_attendance, a.join_time AS my_join
         FROM workshop_sessions s
         LEFT JOIN attendance a ON a.workshop_session_id = s.id AND a.user_id = ?
         WHERE s.workshop_id = ? ORDER BY s.starts_at`
      )
      .all(user?.id ?? 0, workshop.id)
  );

  const attendanceSummary = user && reg && ['CONFIRMED', 'PAID'].includes(reg.status) ? workshopAttendanceSummary(db, workshop.id, user.id) : null;

  const seats = (db.prepare("SELECT COUNT(*) AS c FROM workshop_registrations WHERE workshop_id = ? AND status IN ('CONFIRMED','PAID')").get(workshop.id) as unknown as { c: number }).c;

  return (
    <div className="container-page py-10">
      <TutorContextBridge context={{ type: 'workshop', id: workshop.id, label: workshop.title, text: workshop.description ?? '' }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-400">
        <Link href="/workshops" className="hover:text-brand-700">Workshops</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-ink-700">{workshop.title}</span>
      </nav>

      <PageHead
        title={workshop.title}
        subtitle={workshop.description}
        actions={
          <div className="flex gap-2">
            <Badge tone={workshop.price_cents > 0 ? 'warning' : 'success'}>{workshop.price_cents > 0 ? `₹${workshop.price_cents / 100}` : 'Free'}</Badge>
            <Badge>👥 {seats}/{workshop.capacity} seats</Badge>
            {workshop.certificate_enabled && <Badge tone="success">🎓 Certificate at 90%</Badge>}
          </div>
        }
      />

      <div className="mb-8 flex flex-wrap gap-x-6 gap-y-2 rounded-2xl border border-ink-200 bg-white p-5 text-sm text-ink-600">
        <span>‍🏫 {workshop.instructor_name ?? 'Solai Academy'}</span>
        <span>📅 Starts {fmtDateTime(workshop.starts_at)}</span>
        <span>⏱️ {workshop.duration_minutes} minutes × {sessions.length} sessions</span>
        {workshop.meeting_url && <span>🔗 Live meeting link (shown after registration)</span>}
      </div>

      <RegisterAttend
        workshopId={workshop.id}
        priceCents={workshop.price_cents}
        registrationStatus={reg?.status ?? null}
        sessions={sessions}
        attendanceSummary={attendanceSummary}
        certificateEnabled={workshop.certificate_enabled === 1}
        meetingUrl={reg && ['CONFIRMED', 'PAID'].includes(reg.status) ? workshop.meeting_url : null}
        deadline={workshop.registration_deadline}
      />
    </div>
  );
}
