import Link from 'next/link';
import { getDb } from '@/db';
import { getNav, type SiteSettings } from '@/lib/cms';
import { getCurrentUser } from '@/lib/auth';
import { NotificationBell } from '@/components/NotificationBell';
import { SearchButton } from '@/components/SearchButton';
import { UserMenu } from '@/components/UserMenu';

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const db = getDb();
  const nav = getNav(db, 'header');
  const user = getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center gap-3">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2.5" aria-label={`${settings.site_name} home`}>
          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white">
            ச
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-base font-bold tracking-tight text-ink-950">{settings.site_name}</span>
            <span className="text-[11px] text-ink-500">Tamil Learning Garden</span>
          </span>
        </Link>

        <nav aria-label="Main" className="ml-4 hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link key={n.id} href={n.href} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-100 hover:text-ink-950">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <SearchButton />
          {user && <NotificationBell />}
          {user ? (
            <div className="hidden items-center gap-2 sm:flex">
              <span className="hidden text-sm font-medium text-ink-700 xl:inline">Vanakkam, {user.name.split(' ')[0]} 👋</span>
              <UserMenu user={{ id: user.id, name: user.name, role: user.role }} />
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Start free
              </Link>
            </div>
          )}
          <UserMenu user={user ? { id: user.id, name: user.name, role: user.role } : null} mobile />
        </div>
      </div>
      {/* Secondary mobile nav row */}
      <nav aria-label="Secondary" className="flex items-center gap-1 overflow-x-auto border-t border-ink-100 px-3 py-1.5 lg:hidden">
        {nav.map((n) => (
          <Link key={n.id} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100">
            {n.label}
          </Link>
        ))}
        {!user && (
          <>
            <Link href="/login" className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-700">
              Log in
            </Link>
            <Link href="/register" className="whitespace-nowrap rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-semibold text-white">
              Start free
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
