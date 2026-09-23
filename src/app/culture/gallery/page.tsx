import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems } from '@/lib/culture';
import { CATEGORY_META } from '@/lib/culture-meta';
import { PageHead } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tamil Culture Gallery · தமிழ் கலாசார தொகுப்பு',
  description:
    'Bharatanatyam, Carnatic music, Pongal & Chithirai, Kanchipuram silk — the dance, music, festival and dress of Tamil Nadu in one gallery.',
};

const TABS = [
  { key: 'dance', label: 'Dance · அடவு' },
  { key: 'music', label: 'Music · இசை' },
  { key: 'festival', label: 'Festivals · திருவிழா' },
  { key: 'dress', label: 'Dress · உடை' },
  { key: 'craft', label: 'Crafts · கைவினை' },
];

export default function GalleryPage({ searchParams }: { searchParams: { cat?: string } }) {
  const db = getDb();
  const lang = getLang();
  const head = bi('தமிழ் கலாசார தொகுப்பு', 'Tamil Culture Gallery', lang);
  const cat = TABS.some((t) => t.key === searchParams.cat) ? (searchParams.cat as string) : 'all';

  const groups = (cat === 'all' ? TABS.map((t) => t.key) : [cat])
    .map((k) => ({ key: k, items: getCultureItems(db, [k]), meta: CATEGORY_META[k] }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — from the temple-born grace of Bharatanatyam to the fire-lit streets of Chithirai, and the silk that dresses a Tamil wedding.'
        }
      />

      {/* Category tabs (deep-linkable) */}
      <nav aria-label="Gallery categories" className="mb-8 flex flex-wrap gap-2">
        <a
          href="/culture/gallery"
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            cat === 'all' ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white' : 'border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100'
          }`}
        >
          All
        </a>
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/culture/gallery?cat=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              cat === t.key ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white' : 'border border-white/10 bg-white/5 text-ink-400 hover:text-ink-100'
            }`}
          >
            {CATEGORY_META[t.key].icon} {t.label}
          </a>
        ))}
      </nav>

      {groups.map((g) => (
        <section key={g.key} className="mb-12" aria-label={g.meta.label_en}>
          <div className="mb-5 flex items-center gap-3">
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500/25 to-cyan-500/15 text-xl">
              {g.meta.icon}
            </span>
            <div>
              <h2 className="text-xl font-bold text-ink-950">{g.meta.label_ta}</h2>
              <p className="text-xs font-semibold text-brand-300">{g.meta.label_en}</p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {g.items.map((it) => (
              <article key={it.id} className="card p-5 transition hover:border-brand-400/30 hover:shadow-glow-lg">
                <div className="flex items-start gap-3">
                  <span aria-hidden className="text-3xl">
                    {g.meta.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-ink-950">{it.title_tamil}</h3>
                    <p className="text-sm font-semibold text-brand-300">{it.title}</p>
                    {it.subtitle && <p className="mt-0.5 text-[11px] text-ink-500">{it.subtitle}</p>}
                  </div>
                </div>
                {it.description && <p className="mt-3 text-sm leading-relaxed text-ink-300">{it.description}</p>}
                {it.description_tamil && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{it.description_tamil}</p>}
                {it.facts.length > 0 && (
                  <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-3">
                    {it.facts.map((f) => (
                      <p key={f.l} className="text-xs text-ink-300">
                        <span className="font-semibold text-brand-300">{f.l}:</span> {f.v}
                      </p>
                    ))}
                  </dl>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
