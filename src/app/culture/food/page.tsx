import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems } from '@/lib/culture';
import { PageHead } from '@/components/ui';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tamil Food Explorer · தமிழ் உணவு உலா',
  description:
    'Dosa, idli, filter coffee, kanda vial, adhirasam, murukku — Tamil dishes with their Tamil names, pronunciation and ingredients.',
};

export default function FoodPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('தமிழ் உணவு உலா', 'Tamil Food Explorer', lang);
  const items = getCultureItems(db, ['food']);

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — the Tamil table is generous: tamarind and curry leaves, jaggery and ghee, and a filter coffee you have to try. Learn each dish by name, sound and ingredients.'
        }
        actions={<span className="badge border border-marigold-400/30 bg-marigold-400/10 text-marigold-200">{items.length} dishes</span>}
      />

      <div className="grid gap-5 md:grid-cols-2">
        {items.map((it) => {
          const pronunciation = it.facts.find((f) => f.l.toLowerCase().includes('pronunciation'))?.v;
          const ingredients = it.facts.find((f) => f.l.toLowerCase().includes('ingredient') || f.l.toLowerCase().includes('made of'));
          const tamilName = it.facts.find((f) => f.l === 'Tamil')?.v;
          return (
            <article key={it.id} className="card group relative overflow-hidden p-6 transition hover:border-marigold-400/40 hover:shadow-glow-lg">
              <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-marigold-400/20 to-transparent blur-xl transition group-hover:scale-125" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-extrabold leading-tight text-ink-950">{it.title_tamil}</h3>
                  <p className="mt-0.5 text-sm font-semibold text-marigold-300">
                    {it.title}
                    {pronunciation && <span className="ml-2 text-xs font-normal text-ink-500"> /{pronunciation}/</span>}
                  </p>
                </div>
                <span aria-hidden className="text-4xl transition group-hover:scale-110">
                  🍲
                </span>
              </div>

              {tamilName && <p className="mt-2 text-sm text-brand-200">{tamilName}</p>}
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{it.description}</p>
              {it.description_tamil && <p className="mt-1 text-xs leading-relaxed text-ink-500">{it.description_tamil}</p>}

              {ingredients && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {ingredients.v.split(',').map((ing) => (
                    <span key={ing} className="badge border border-white/10 bg-white/5 text-ink-300">
                      🌶️ {ing.trim()}
                    </span>
                  ))}
                </div>
              )}

              {it.subtitle && (
                <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                  {it.subtitle}
                  {it.era ? ` · ${it.era}` : ''}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
