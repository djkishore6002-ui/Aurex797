'use client';

import { useState } from 'react';
import { Explorer3D } from '@/components/Explorer3D';
import { CultureStageCard, type StageItem } from '@/components/CultureStageCard';

/**
 * 3D Tamil Temple & Heritage Explorer — drag-rotate/zoom stage with
 * prev/next navigation and a selectable list.
 */
export function HeritageExplorer({ items, intro }: { items: StageItem[]; intro?: string }) {
  const [idx, setIdx] = useState(0);
  const item = items[idx];
  if (!item) return null;

  const go = (d: number) => setIdx((i) => (i + d + items.length) % items.length);

  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-3">
        <button type="button" onClick={() => go(-1)} className="btn-ghost h-10 w-10 !p-0 text-lg" aria-label="Previous monument">
          ←
        </button>
        <p className="min-w-40 text-center text-sm font-semibold text-ink-300">
          {item.title} <span className="block text-xs font-normal text-ink-500">
            {item.region ?? ''} {item.era ? `· ${item.era}` : ''}
          </span>
        </p>
        <button type="button" onClick={() => go(1)} className="btn-ghost h-10 w-10 !p-0 text-lg" aria-label="Next monument">
          →
        </button>
      </div>

      <Explorer3D label={item.title}>
        <CultureStageCard item={item} />
      </Explorer3D>

      {/* dot selector */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
        {items.map((it, i) => (
          <button
            key={it.id}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={it.title}
            className={`h-2.5 rounded-full transition-all ${
              i === idx ? 'w-7 bg-gradient-to-r from-brand-500 to-cyan-400' : 'w-2.5 bg-white/15 hover:bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* detail + list */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden className="text-3xl">
              {item.icon}
            </span>
            <div>
              <h3 className="text-xl font-bold text-ink-950">{item.title_tamil}</h3>
              <p className="text-sm font-semibold text-brand-300">
                {item.title}
                {item.subtitle ? ` — ${item.subtitle}` : ''}
              </p>
            </div>
          </div>
          {intro && <p className="mt-4 text-sm leading-relaxed text-ink-400">{intro}</p>}
          {item.description && <p className="mt-3 text-sm leading-relaxed text-ink-300">{item.description}</p>}
          {item.facts.length > 0 && (
            <dl className="mt-5 grid gap-3 sm:grid-cols-2">
              {item.facts.map((f) => (
                <div key={f.l} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">{f.l}</dt>
                  <dd className="mt-0.5 text-sm text-ink-200">{f.v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="card max-h-[420px] space-y-1 overflow-y-auto p-3">
          {items.map((it, i) => (
            <button
              key={it.id}
              type="button"
              onClick={() => setIdx(i)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                i === idx ? 'bg-brand-500/20' : 'hover:bg-white/5'
              }`}
            >
              <span aria-hidden className="text-xl">
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-100">{it.title}</span>
                <span className="block truncate text-[11px] text-ink-500">{it.title_tamil}{it.region ? ` · ${it.region}` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
