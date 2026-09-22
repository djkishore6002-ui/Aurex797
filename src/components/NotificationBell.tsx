'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { timeAgo } from '@/lib/utils';

interface Notif {
  id: number;
  category: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: number;
  created_at: string;
}

const CATEGORY_ICON: Record<string, string> = {
  learning: '📚',
  workshop: '🎤',
  teacher: '🧑‍🏫',
  certificate: '🎓',
  community: '🌿',
  system: '⚙️',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch('/api/notifications')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          setItems(d.items ?? []);
          setUnread(d.unread ?? 0);
        })
        .catch(() => undefined);
    load();
    const iv = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, []);

  const markAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    setUnread(0);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-xl p-2 text-ink-600 hover:bg-ink-100"
        aria-label={`Notifications (${unread} unread)`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-marigold-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-bold">Notifications</p>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs font-semibold text-brand-700 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-500">No notifications yet 🌱</p>
              ) : (
                <ul>
                  {items.map((n) => (
                    <li key={n.id} className={`border-b border-ink-50 px-4 py-3 last:border-b-0 ${n.is_read ? '' : 'bg-brand-50/50'}`}>
                      <div className="flex gap-2.5">
                        <span aria-hidden className="mt-0.5 text-base">
                          {CATEGORY_ICON[n.category] ?? '🔔'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                          {n.body && <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{n.body}</p>}
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-[11px] text-ink-400">{timeAgo(n.created_at)}</span>
                            {n.link_url && (
                              <Link
                                href={n.link_url}
                                onClick={() => setOpen(false)}
                                className="text-xs font-semibold text-brand-700 hover:underline"
                              >
                                View
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-ink-100 bg-ink-50 px-4 py-2.5">
              <Link href="/notifications" onClick={() => setOpen(false)} className="text-xs font-semibold text-brand-700 hover:underline">
                See all notifications →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
