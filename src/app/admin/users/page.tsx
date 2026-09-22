import { getDb } from '@/db';
import { PageHead } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { UsersAdmin } from './users-admin';

export const dynamic = 'force-dynamic';

export default function AdminUsersPage() {
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at, u.deleted_at,
        (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollments,
        (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id AND c.revoked_at IS NULL) AS certificates
       FROM users u ORDER BY u.created_at DESC LIMIT 200`
    )
    .all() as unknown as {
    id: number;
    email: string;
    name: string;
    role: string;
    is_active: number;
    created_at: string;
    deleted_at: string | null;
    enrollments: number;
    certificates: number;
  }[];

  return (
    <div>
      <PageHead title="Users" subtitle="Create, edit, deactivate or (soft-)delete users and change roles. All changes are audited." />
      <UsersAdmin
        users={users.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          is_active: u.is_active === 1,
          created: fmtDate(u.created_at),
          deleted: u.deleted_at != null,
          enrollments: u.enrollments,
          certificates: u.certificates,
        }))}
      />
    </div>
  );
}
