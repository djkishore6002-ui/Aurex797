import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { Badge, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Community' };

export default function CommunityPage() {
  const db = getDb();
  const communities = db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM community_members m WHERE m.community_id = c.id) AS members,
        (SELECT COUNT(*) FROM posts p WHERE p.community_id = c.id AND p.deleted_at IS NULL AND p.is_hidden = 0) AS posts
       FROM communities c WHERE c.deleted_at IS NULL ORDER BY c.id`
    )
    .all() as unknown as { id: number; slug: string; name: string; description: string | null; members: number; posts: number; is_private: number }[];

  return (
    <div className="container-page py-10">
      <PageHead
        title="Learning communities"
        subtitle="Grow together. Introduce yourself in Tamil, get corrections, share phrases — moderation keeps it a safe place."
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <Link key={c.id} href={`/community/${c.slug}`} className="card group p-6 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-bold text-ink-950 group-hover:text-brand-800">{c.name}</h2>
              {c.is_private ? <Badge>Private</Badge> : <Badge tone="success">Open</Badge>}
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-ink-500">{c.description}</p>
            <p className="mt-4 text-xs text-ink-400">
              🌿 {c.members} members · 💬 {c.posts} posts
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
