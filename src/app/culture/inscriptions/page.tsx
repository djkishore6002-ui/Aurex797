import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems } from '@/lib/culture';
import { PageHead } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tamil Inscription Explorer · தமிழ் கல்வெட்டு உலா',
  description:
    'Read the oldest Tamil writing: Mangulam, Jambai, Mangudi, Korkai, Adichanallur — old Tamil (Tamil-Brahmi) decoded into modern meaning.',
};

export default function InscriptionsPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('தமிழ் கல்வெட்டு உலா', 'Tamil Inscription Explorer', lang);
  const items = getCultureItems(db, ['inscription']);

  return (
    <div className="container-page max-w-4xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — Tamil was being carved on stone and pottery as early as 600 BCE. Open each find to read the old Tamil and its modern meaning.'
        }
        actions={<span className="badge border border-marigold-400/30 bg-marigold-400/10 text-marigold-200">600 BCE → today</span>}
      />

      <div className="mb-8 rounded-xl border border-white/10 bg-gradient-to-r from-marigold-400/10 to-brand-500/10 px-5 py-4">
        <p className="text-sm text-ink-300">
          <span className="font-semibold text-marigold-200">Tamil-Brahmi (தமிழ்-பிராமி)</span> — the script of the Sangam age: Brahmi, adapted to Tamil
          sounds. These carvings prove Tamil literacy was common among kings, monks, traders and potters alike.
        </p>
      </div>

      {/* Timeline */}
      <ol className="relative space-y-5 border-l-2 border-brand-500/30 pl-6">
        {items.map((it) => (
          <li key={it.id} className="relative">
            <span aria-hidden className="absolute -left-[31px] top-6 h-3.5 w-3.5 rounded-full border-2 border-[#0a0f22] bg-marigold-400 shadow-glow-sm" />
            <details className="card group overflow-hidden open:shadow-glow-lg">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="text-2xl">
                  🪨
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-base font-bold text-ink-950">{it.title}</span>
                    {it.subtitle && <span className="text-xs text-ink-500">{it.subtitle}</span>}
                  </span>
                  <span className="mt-1 block font-serif text-sm italic text-marigold-200/90">{it.meaning?.split('—')[0]?.trim()}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="badge border border-white/10 bg-white/5 text-ink-400">{it.era}</span>
                  <span className="text-ink-500 transition group-open:rotate-45">＋</span>
                </span>
              </summary>
              <div className="space-y-4 border-t border-white/10 px-5 py-5">
                {it.meaning && (
                  <div className="rounded-xl bg-[#0a0f22] px-5 py-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-300">Old Tamil (transliteration)</p>
                    <p className="mt-1 font-serif text-lg italic leading-relaxed text-ink-100">{it.meaning}</p>
                    {it.meaning_tamil && (
                      <>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-marigold-300">இன்றைய தமிழ் · Modern Tamil</p>
                        <p className="mt-1 text-base text-marigold-100">{it.meaning_tamil}</p>
                      </>
                    )}
                  </div>
                )}
                {it.description && <p className="text-sm leading-relaxed text-ink-300">{it.description}</p>}
                {it.description_tamil && <p className="text-sm leading-relaxed text-ink-400">{it.description_tamil}</p>}
                <dl className="grid gap-3 sm:grid-cols-2">
                  {it.facts.map((f) => (
                    <div key={f.l} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5">
                      <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">{f.l}</dt>
                      <dd className="mt-0.5 text-sm text-ink-200">{f.v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/5 px-5 py-4 text-xs text-ink-500">
        Sources: Government of Tamil Nadu Archaeology, ASI excavations (Adichanallur, Keeladi, Korkai), and epigraphic studies (K.V. Subrahmany Aiyar,
        S. Ramachandra Rao). Dates are scholarly estimates.
      </div>
    </div>
  );
}
