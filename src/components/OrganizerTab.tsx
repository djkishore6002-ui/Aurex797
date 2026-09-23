'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function OrganizerTab({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === '/organizer' ? pathname === '/organizer' : pathname.startsWith(href);
  return (
    <Link href={href} className={`rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-brand-700 text-white' : 'border border-ink-200 bg-white text-ink-600 hover:bg-ink-50'}`}>
      {label}
    </Link>
  );
}
