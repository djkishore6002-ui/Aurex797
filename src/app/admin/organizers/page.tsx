import { getDb } from '@/db';
import { PageHead, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { OrganizersAdmin } from './organizers-admin';

export const dynamic = 'force-dynamic';

export default function AdminOrganizersPage() {
  const db = getDb();
  const organizers = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.is_active, u.created_at, op.title, op.permissions
       FROM users u LEFT JOIN organizer_profiles op ON op.user_id = u.id
       WHERE u.role = 'organizer' AND u.deleted_at IS NULL ORDER BY u.id`
    )
    .all() as unknown as { id: number; email: string; name: string; is_active: number; created_at: string; title: string | null; permissions: string | null }[];

  return (
    <div>
      <PageHead title="Organizers" subtitle="Organizers manage assigned courses, workshops, attendance, questions and announcements. Their permissions are assigned here." />
      <OrganizersAdmin
        organizers={organizers.map((o) => ({
          id: o.id,
          email: o.email,
          name: o.name,
          active: o.is_active === 1,
          created: fmtDate(o.created_at),
          title: o.title ?? '',
          permissions: o.permissions ? (JSON.parse(o.permissions) as unknown as string[]) : [],
        }))}
      />
    </div>
  );
}
