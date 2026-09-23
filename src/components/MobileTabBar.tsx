import Link from 'next/link';
import { Home, Library, Mic, Users, User } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/db';
import { getNav } from '@/lib/cms';

/**
 * Mobile bottom navigation (spec §48): Home · Learn · Workshops · Community · Profile
 * The AI tutor has its own floating button, so it stays accessible everywhere.
 */
export function MobileTabBar() {
  const user = getCurrentUser();
  if (!user) return null;
  const db = getDb();
  const nav = getNav(db, 'mobile');
  const iconFor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return <Home className="h-5 w-5" aria-hidden />;
      case 'learn':
        return <Library className="h-5 w-5" aria-hidden />;
      case 'workshops':
        return <Mic className="h-5 w-5" aria-hidden />;
      case 'community':
        return <Users className="h-5 w-5" aria-hidden />;
      default:
        return <User className="h-5 w-5" aria-hidden />;
    }
  };
  const items = nav.length ? nav : [{ id: 1, label: 'Home', href: '/dashboard' }, { id: 2, label: 'Learn', href: '/learn' }, { id: 3, label: 'Workshops', href: '/workshops' }, { id: 4, label: 'Community', href: '/community' }];
  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {items.map((n) => (
        <Link key={n.id} href={n.href} className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-ink-500 hover:text-brand-700">
          {iconFor(n.label)}
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
