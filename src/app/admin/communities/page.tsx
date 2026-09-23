import { getDb } from '@/db';
import { PageHead } from '@/components/ui';
import { timeAgo } from '@/lib/utils';
import { CommunitiesAdmin } from './communities-admin';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminCommunitiesPage() {
  const db = getDb();
  const communities = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM community_members m WHERE m.community_id = c.id) AS members,
        (SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id AND p.deleted_at IS NULL) AS posts
       FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.id`
    )
    .all() as unknown as Record<string, unknown>[];

  const hiddenPosts = db
    .prepare(
      `SELECT p.id, p.title, p.community_id, c.name AS community, p.hidden_reason, u.name AS author
       FROM posts p JOIN communities c ON c.id = p.community_id JOIN users u ON u.id = p.user_id
       WHERE p.is_hidden = 1 AND p.deleted_at IS NULL ORDER BY p.updated_at DESC LIMIT 20`
    )
    .all() as unknown as Record<string, unknown>[];

  const reports = db
    .prepare(
      `SELECT r.*, u.name AS reporter FROM reports r JOIN users u ON u.id = r.reporter_id ORDER BY r.created_at DESC LIMIT 30`
    )
    .all() as unknown as Record<string, unknown>[];

  return (
    <div>
      <PageHead title="Communities" subtitle="Manage groups, moderate flagged content and handle reports." />
      <CommunitiesAdmin
        communities={communities.map((c) => ({ id: c.id as number, name: c.name as string, description: (c.description as string | null), members: c.members as number, posts: c.posts as number, is_private: c.is_private as number }))}
        hiddenPosts={hiddenPosts.map((p) => ({ id: p.id as number, title: p.title as string, community: p.community as string, reason: (p.hidden_reason as string | null), author: p.author as string, updated: timeAgo(p.updated_at as string) }))}
        reports={reports.map((r) => ({ id: r.id as number, target_type: r.target_type as string, target_id: r.target_id as number, reason: r.reason as string, reporter: r.reporter as string, status: r.status as string, created: timeAgo(r.created_at as string) }))}
      />
    </div>
  );
}
