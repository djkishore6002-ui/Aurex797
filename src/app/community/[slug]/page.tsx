import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { timeAgo } from '@/lib/utils';
import { Badge, EmptyState, PageHead } from '@/components/ui';
import { CommunityActions } from './community-actions';
import { PostActions } from './post-actions';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const db = getDb();
  const c = db.prepare('SELECT name FROM communities WHERE slug = ? AND deleted_at IS NULL').get(params.slug) as unknown as { name: string } | undefined;
  return { title: c?.name ?? 'Community not found' };
}

export default function CommunityDetailPage({ params }: { params: { slug: string } }) {
  const db = getDb();
  const community = db.prepare('SELECT * FROM communities WHERE slug = ? AND deleted_at IS NULL').get(params.slug) as unknown as {
    id: number;
    name: string;
    description: string | null;
    is_private: number;
  } | undefined;
  if (!community) notFound();

  const user = getCurrentUser();
  const isMember = user ? db.prepare('SELECT role FROM community_members WHERE community_id = ? AND user_id = ?').get(community.id, user.id) : null;
  const isModerator = isMember?.role === 'moderator' || user?.role === 'super_admin' || user?.role === 'organizer';

  const posts = db
    .prepare(
      `SELECT p.*, u.name AS author,
        (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.deleted_at IS NULL AND c.is_hidden = 0) AS comments_count,
        (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id) AS reactions_count
       FROM posts p JOIN users u ON u.id = p.user_id
       WHERE p.community_id = ? AND p.deleted_at IS NULL AND (p.is_hidden = 0 OR ? = 1)
       ORDER BY p.created_at DESC LIMIT 50`
    )
    .all(community.id, isModerator ? 1 : 0) as unknown as {
    id: number;
    title: string;
    body: string;
    author: string;
    created_at: string;
    is_hidden: number;
    hidden_reason: string | null;
    comments_count: number;
    reactions_count: number;
  }[];

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-400">
        <Link href="/community" className="hover:text-brand-700">Community</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-ink-700">{community.name}</span>
      </nav>
      <PageHead
        title={community.name}
        subtitle={community.description}
        actions={<CommunityActions communityId={community.id} isMember={!!isMember} />}
      />

      <div className="space-y-4">
        {posts.length === 0 ? (
          <EmptyState icon="💬" title="No posts yet" body={isMember ? 'Be the first to introduce yourself!' : 'Join the community to start a conversation.'} />
        ) : (
          posts.map((p) => <PostCard key={p.id} postId={p.id} {...p} isModerator={!!isModerator} userId={user?.id ?? null} />)
        )}
      </div>
    </div>
  );
}

function PostCard({
  postId,
  title,
  body,
  author,
  created_at,
  is_hidden,
  hidden_reason,
  comments_count,
  reactions_count,
  isModerator,
  userId,
}: {
  postId: number;
  title: string;
  body: string;
  author: string;
  created_at: string;
  is_hidden: number;
  hidden_reason: string | null;
  comments_count: number;
  reactions_count: number;
  isModerator: boolean;
  userId: number | null;
}) {
  const db = getDb();
  const comments = db
    .prepare(
      `SELECT c.body, u.name AS author, c.created_at, c.is_hidden
       FROM comments c JOIN users u ON u.id = c.user_id
       WHERE c.post_id = ? AND c.deleted_at IS NULL AND c.is_hidden = 0 ORDER BY c.created_at LIMIT 20`
    )
    .all(postId) as unknown as { body: string; author: string; created_at: string }[];
  const reactions = db.prepare('SELECT type, COUNT(*) AS n FROM reactions WHERE post_id = ? GROUP BY type').all(postId) as unknown as { type: string; n: number }[];
  const myReactions = userId ? db.prepare('SELECT type FROM reactions WHERE post_id = ? AND user_id = ?').all(postId, userId) as unknown as { type: string }[] : [];

  return (
    <article className={`card p-5 ${is_hidden ? 'border-red-200' : ''}`}>
      {is_hidden && (
        <div className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          Hidden by moderation{hidden_reason ? ` — ${hidden_reason}` : ''}
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-bold text-ink-950">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-400">
            {author} · {timeAgo(created_at)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs text-ink-400">
          <span title="Comments">💬 {comments_count}</span>
          <span title="Reactions">🌿 {reactions_count}</span>
        </div>
      </div>
      <p className="tamil mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink-700">{body}</p>

      {reactions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {reactions.map((r) => (
            <span key={r.type} className={`badge ${myReactions.some((m) => m.type === r.type) ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-600'}`}>
              {r.type === 'like' ? '👍' : r.type === 'helpful' ? '💡' : '🎉'} {r.n}
            </span>
          ))}
        </div>
      )}

      {comments.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          {comments.map((c, i) => (
            <li key={i} className="rounded-xl bg-ink-50 px-4 py-3">
              <p className="text-xs font-bold text-ink-700">
                {c.author} <span className="font-normal text-ink-400">· {timeAgo(c.created_at)}</span>
              </p>
              <p className="tamil mt-1 text-sm leading-relaxed text-ink-700">{c.body}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4">
        <PostActions postId={postId} canReact={!!userId} />
      </div>
    </article>
  );
}
