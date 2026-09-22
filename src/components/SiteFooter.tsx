import Link from 'next/link';
import { getDb } from '@/db';
import { getFooterLinks, getSettings } from '@/lib/cms';

export function SiteFooter() {
  const db = getDb();
  const settings = getSettings();
  const links = getFooterLinks(db);
  const columns = new Map<string, { label: string; href: string }[]>();
  for (const l of links) {
    if (!columns.has(l.column_label)) columns.set(l.column_label, []);
    columns.get(l.column_label)!.push({ label: l.label, href: l.href });
  }
  return (
    <footer className="mt-16 border-t border-ink-200 bg-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white">
              ச
            </span>
            <div>
              <p className="font-bold">{settings.site_name}</p>
              <p className="text-xs text-ink-500">{settings.tagline}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-600">{settings.description}</p>
          <p className="mt-4 text-xs text-ink-400">
            Development build — demo data. Contact: <a href={`mailto:${settings.contact_email}`} className="underline">{settings.contact_email}</a>
          </p>
        </div>
        {[...columns.entries()].map(([label, items]) => (
          <nav key={label} aria-label={label}>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">{label}</h3>
            <ul className="space-y-2">
              {items.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-ink-600 hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-100">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-ink-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {settings.site_name}. Built for learners, by learners.</p>
          <p className="tamil">வணக்கம் 🙏 · நன்றி</p>
        </div>
      </div>
    </footer>
  );
}
