'use client';

import { useState } from 'react';
import { Explorer3D } from '@/components/Explorer3D';
import { CultureStageCard, type StageItem } from '@/components/CultureStageCard';

/** Compact 3D museum showcase (used on the culture hub). */
export function MuseumShowcase({ items }: { items: StageItem[] }) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  if (!item) return null;
  const go = (d: number) => setIdx((i) => (i + d + items.length) % items.length);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div>
        <div className="mb-3 flex items-center justify-center gap-3">
          <button type="button" onClick={() => go(-1)} className="btn-ghost h-10 w-10 !p-0 text-lg" aria-label="Previous object">
            ←
          </button>
          <p className="text-sm font-semibold text-ink-200">
            {item.title_tamil} <span className="text-xs font-normal text-ink-500">· {item.title}</span>
          </p>
          <button type="button" onClick={() => go(1)} className="btn-ghost h-10 w-10 !p-0 text-lg" aria-label="Next object">
            →
          </button>
        </div>
        <Explorer3D label={item.title} minZoom={0.5} maxZoom={2.4}>
          <CultureStageCard item={item} />
        </Explorer3D>
      </div>
      <div className="card flex flex-col justify-center p-5">
        <h3 className="text-lg font-bold text-ink-950">{item.title}</h3>
        {item.era && <p className="mt-0.5 text-xs font-semibold text-marigold-300">{item.era}</p>}
        {item.description && <p className="mt-3 text-sm leading-relaxed text-ink-300">{item.description}</p>}
        {item.facts.length > 0 && (
          <dl className="mt-4 space-y-2">
            {item.facts.map((f) => (
              <div key={f.l} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <dt className="text-[10px] font-semibold uppercase tracking-wide text-brand-300">{f.l}</dt>
                <dd className="text-xs text-ink-200">{f.v}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-4 flex gap-1.5">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={it.title}
              className={`h-2 rounded-full transition-all ${i === idx ? 'w-6 bg-gradient-to-r from-brand-500 to-cyan-400' : 'w-2 bg-white/15'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
