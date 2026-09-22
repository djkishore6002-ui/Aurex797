import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { AnnouncementsAdmin } from './announcements-admin';

export const dynamic = 'force-dynamic';

export default function AdminAnnouncementsPage() {
  const db = getDb();
  const announcements = db
    .prepare(
      `SELECT a.*, u.name AS author,
        (SELECT title FROM courses c WHERE c.id = a.target_id) AS target_course,
        (SELECT title FROM workshops w WHERE w.id = a.target_id) AS target_workshop,
        (SELECT name FROM communities co WHERE co.id = a.target_id) AS target_community
       FROM announcements a LEFT JOIN users u ON u.id = a.created_by
       WHERE a.deleted_at IS NULL ORDER BY a.created_at DESC LIMIT 100`
    )
    .all() as unknown as Record<string, unknown>[];
  const courses = plainRows<{ id: number; title: string }>(db.prepare('SELECT id, title FROM courses WHERE deleted_at IS NULL').all());
  const workshops = plainRows<{ id: number; title: string }>(db.prepare('SELECT id, title FROM workshops WHERE deleted_at IS NULL').all());
  const communities = plainRows<{ id: number; name: string }>(db.prepare('SELECT id, name FROM communities WHERE deleted_at IS NULL').all());

  return (
    <div>
      <PageHead title="Announcements" subtitle="Publish to everyone, a course, a workshop, a community, or a single learner. Publishing notifies the targeted users instantly." />
      <AnnouncementsAdmin
        announcements={announcements.map((a) => ({
          id: a.id as number,
          title: a.title as string,
          body: a.body as string,
          scope: a.scope as string,
          target_id: (a.target_id as number | null),
          target_label: ((a.target_course ?? a.target_workshop ?? a.target_community) as unknown as string | null),
          is_published: a.is_published as number,
          created_by: (a.author as string) ?? '—',
          created_at: timeAgo(a.created_at as string),
        }))}
        targets={{ courses, workshops, communities }}
      />
    </div>
  );
}
