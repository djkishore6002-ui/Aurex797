'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';


const NAV: { href: string; label: string; icon: string; section: string }[] = [
  { href: '/admin', label: 'Dashboard', icon: '📊', section: 'Overview' },
  { href: '/admin/users', label: 'Users', icon: '👥', section: 'People' },
  { href: '/admin/organizers', label: 'Organizers', icon: '🎪', section: 'People' },
  { href: '/admin/courses', label: 'Courses', icon: '📚', section: 'Content' },
  { href: '/admin/vocabulary', label: 'Vocabulary', icon: '📝', section: 'Content' },
  { href: '/admin/workshops', label: 'Workshops', icon: '🎤', section: 'Content' },
  { href: '/admin/certificates', label: 'Certificates', icon: '🎓', section: 'Content' },
  { href: '/admin/announcements', label: 'Announcements', icon: '📣', section: 'Content' },
  { href: '/admin/communities', label: 'Communities', icon: '🌿', section: 'Content' },
  { href: '/admin/questions', label: 'Questions', icon: '🙋', section: 'Teaching' },
  { href: '/admin/ai', label: 'AI Knowledge', icon: '🤖', section: 'Platform' },
  { href: '/admin/cms', label: 'Website CMS', icon: '🎨', section: 'Platform' },
  { href: '/admin/audit', label: 'Audit log', icon: '🧾', section: 'Platform' },
];

export function AdminShell({ user, children }: { user: { name: string }; pathname?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const sections = new Map<string, typeof NAV>();
  for (const item of NAV) sections.set(item.section, [...(sections.get(item.section) ?? []), item]);

  return (
    <div className="container-page py-8">
      <div className="mb-8 rounded-2xl border border-brand-200 bg-brand-50/60 px-5 py-3 text-sm text-brand-900">
        <b>Super Admin console</b> — every change here is database-driven and takes effect immediately on the website, the AI knowledge base and the audit log. Signed in as <b>{user.name}</b>.
      </div>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Admin" className="space-y-5">
          {[...sections.entries()].map(([section, items]) => (
            <div key={section}>
              <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-ink-400">{section}</p>
              <ul className="space-y-0.5">
                {items.map((it) => {
                  const active = it.href === '/admin' ? pathname === '/admin' : pathname.startsWith(it.href);
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-white'}`}
                      >
                        <span aria-hidden>{it.icon}</span>
                        {it.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
