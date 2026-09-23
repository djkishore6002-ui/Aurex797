import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { ResourcesAdmin } from './resources-admin';

export const dynamic = 'force-dynamic';

export default function AdminResourcesPage() {
  const db = getDb();
  const resources = db
    .prepare('SELECT * FROM learning_resources ORDER BY sort_order, id')
    .all() as unknown as Record<string, unknown>[];
  const courses = plainRows<{ id: number; title: string }>(db.prepare('SELECT id, title FROM courses WHERE deleted_at IS NULL').all());

  return (
    <div>
      <PageHead
        title="Learning Resources"
        subtitle="The separate resource store: NPTEL, YouTube, Alison and other free videos, notes, books and guides shown on /resources."
      />
      <ResourcesAdmin
        resources={resources.map((r) => ({
          id: Number(r.id),
          title: String(r.title),
          title_tamil: (r.title_tamil as string | null) ?? null,
          type: String(r.type),
          provider: String(r.provider),
          url: String(r.url),
          youtube_id: (r.youtube_id as string | null) ?? null,
          description: (r.description as string | null) ?? null,
          language: String(r.language),
          level: (r.level as string | null) ?? null,
          sort_order: Number(r.sort_order ?? 0),
          is_published: Number(r.is_published),
        }))}
        courses={courses}
      />
    </div>
  );
}
