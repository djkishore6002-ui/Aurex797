import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { timeAgo } from '@/lib/utils';
import { Badge, EmptyState, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Notifications' };

const CATEGORY_ICON: Record<string, string> = {
  learning: '📚',
  workshop: '🎤',
  teacher: '🧑‍🏫',
  certificate: '🎓',
  community: '🌿',
  system: '⚙️',
};

export default function NotificationsPage() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  const db = getDb();
  const items = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(user.id) as unknown as { id: number; category: string; title: string; body: string | null; link_url: string | null; is_read: number; created_at: string }[];

  return (
    <div className="container-page max-w-2xl py-10">
      <PageHead title="Notifications" subtitle="Learning, workshops, teachers, certificates, community and system updates." />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="No notifications" body="You are all caught up!" />
      ) : (
        <ul className="card divide-y divide-ink-100 overflow-hidden">
          {items.map((n) => (
            <li key={n.id} className={`flex gap-3 px-5 py-4 ${n.is_read ? '' : 'bg-brand-50/40'}`}>
              <span aria-hidden className="mt-0.5 text-lg">{CATEGORY_ICON[n.category] ?? '🔔'}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-ink-500">{n.body}</p>}
                <p className="mt-1 text-[11px] text-ink-400">
                  {timeAgo(n.created_at)} · <Badge>{n.category}</Badge>
                </p>
              </div>
              {n.link_url && (
                <Link href={n.link_url} className="shrink-0 self-center text-xs font-semibold text-brand-700 hover:underline">
                  View →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
