'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, LogOut, Menu, Settings, Shield } from 'lucide-react';
import { usePathname } from 'next/navigation';

interface User {
  id: number;
  name: string;
  role: string;
}

export function UserMenu({ user, mobile = false }: { user: User | null; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  if (!user) return null;

  const items = [
    { href: '/profile', label: 'My profile', icon: <Settings className="h-4 w-4" /> },
    ...(user.role === 'super_admin' ? [{ href: '/admin', label: 'Super Admin', icon: <Shield className="h-4 w-4" /> }] : []),
    ...(user.role === 'organizer' || user.role === 'teacher' ? [{ href: '/organizer', label: 'Organizer dashboard', icon: <Menu className="h-4 w-4" /> }] : []),
  ];

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className={`relative ${mobile ? 'sm:hidden' : 'hidden sm:block'}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-ink-100"
        aria-label="Account menu"
        aria-expanded={open}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">{initials}</span>
        <ChevronDown className="h-4 w-4 text-ink-400" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-ink-200 bg-white py-1.5 shadow-xl">
            <div className="border-b border-ink-100 px-4 py-2.5">
              <p className="truncate text-sm font-bold">{user.name}</p>
              <p className="text-xs capitalize text-ink-500">{user.role.replace('_', ' ')}</p>
            </div>
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm ${pathname === it.href ? 'bg-brand-50 font-semibold text-brand-800' : 'text-ink-700 hover:bg-ink-50'}`}
              >
                {it.icon}
                {it.label}
              </Link>
            ))}
            <form
              action="/api/auth/logout"
              method="POST"
              className="mt-1 border-t border-ink-100 pt-1"
            >
              <button type="submit" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
