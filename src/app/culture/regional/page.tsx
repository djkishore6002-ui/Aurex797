import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems } from '@/lib/culture';
import { PageHead } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Regional Tamil Explorer · மண்டல தமிழ் உலா',
  description:
    'How Tamil sounds across the state: Chennai city speech, Kongu (Coimbatore), Madurai and deep-south Tiyya (Tirunelveli) — with sample phrases.',
};

export default function RegionalPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('மண்டல தமிழ் உலா', 'Regional Tamil Explorer', lang);
  const items = getCultureItems(db, ['region']);

  return (
    <div className="container-page max-w-5xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — one language, many voices. A Kongu "மச்சான்", a Madurai "மாட்டா" and a Chennai "ondy" all mean something familiar — if you know where to listen.'
        }
        actions={<span className="badge border border-brand-400/30 bg-brand-500/15 text-brand-200">{items.length} regions</span>}
      />

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((it) => {
          const sample = it.facts.find((f) => f.l === 'Sample');
          const word = it.facts.find((f) => f.l === 'Word');
          const feel = it.facts.find((f) => f.l === 'Feel');
          return (
            <article key={it.id} className="card relative overflow-hidden p-6 transition hover:border-brand-400/40 hover:shadow-glow-lg">
              <div aria-hidden className="pointer-events-none absolute -left-10 -top-10 h-36 w-36 rounded-full bg-gradient-to-br from-brand-500/20 to-transparent blur-xl" />
              <div className="flex items-center gap-3">
                <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-cyan-500/15 text-2xl">
                  🗣️
                </span>
                <div>
                  <h3 className="text-lg font-bold text-ink-950">{it.title_tamil}</h3>
                  <p className="text-sm font-semibold text-brand-300">{it.title}</p>
                </div>
              </div>

              {sample && (
                <div className="mt-4 rounded-xl border border-brand-400/20 bg-brand-500/10 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-300">Hear it · கேளுங்கள்</p>
                  <p className="mt-1 text-lg font-semibold text-ink-100">{sample.v}</p>
                </div>
              )}

              {it.description && <p className="mt-4 text-sm leading-relaxed text-ink-300">{it.description}</p>}
              {it.description_tamil && <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{it.description_tamil}</p>}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {word && <span className="badge border border-marigold-400/30 bg-marigold-400/10 text-marigold-200">⭐ {word.v}</span>}
                {feel && <span className="badge border border-white/10 bg-white/5 text-ink-300">{feel.v}</span>}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-xs text-ink-500">
        These are friendly, widely understood expressions from each region — real speech patterns, simplified for learners. Every region has hundreds
        more words of its own.
      </div>
    </div>
  );
}
