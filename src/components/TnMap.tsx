'use client';

import { useState } from 'react';

export interface DistrictRow {
  id: number;
  name: string;
  name_tamil: string;
  zone: string;
  famous_for: string | null;
  culture: string | null;
  language_note: string | null;
  food: string | null;
  temple: string | null;
  festival: string | null;
}

/** Approximate geographic positions (stylized map, viewBox 0 0 430 540). */
const DOTS: Record<string, { x: number; y: number }> = {
  Chennai: { x: 372, y: 122 },
  Madurai: { x: 178, y: 382 },
  Thanjavur: { x: 272, y: 300 },
  Coimbatore: { x: 168, y: 182 },
  Tiruchirappalli: { x: 248, y: 266 },
  Tirunelveli: { x: 188, y: 452 },
  Kanyakumari: { x: 208, y: 496 },
  Vellore: { x: 282, y: 138 },
  Salem: { x: 244, y: 92 },
  Dindigul: { x: 176, y: 306 },
  Karur: { x: 230, y: 250 },
  Nagapattinam: { x: 336, y: 322 },
};

const ZONE_COLOR: Record<string, string> = {
  north: '#38bdf8',
  central: '#a78bfa',
  south: '#f59e0b',
  coast: '#34d399',
  west: '#fb7185',
};
const ZONE_LABEL: Record<string, string> = {
  north: 'North',
  central: 'Central',
  south: 'South',
  coast: 'Coast',
  west: 'West (Kongu)',
};

const OUTLINE =
  'M155,100 L245,55 L395,105 C402,150 392,200 382,242 L358,332 C348,382 322,432 272,472 C248,496 226,510 206,520 C196,504 176,480 152,432 C132,396 117,370 112,342 C97,292 90,272 86,252 C89,202 96,176 101,162 C116,132 136,116 155,100 Z';

/**
 * Virtual Tamil Nadu map — a stylized outline with clickable district
 * dots; selecting one opens the culture/language/food/temple panel.
 */
export function TnMap({ districts }: { districts: DistrictRow[] }) {
  const [sel, setSel] = useState<number | null>(districts[0]?.id ?? null);
  const active = districts.find((d) => d.id === sel) ?? districts[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="card p-4">
        <svg viewBox="0 0 430 540" className="mx-auto w-full max-w-md" role="img" aria-label="Stylized map of Tamil Nadu with clickable districts">
          <defs>
            <radialGradient id="tn-glow" cx="50%" cy="35%" r="80%">
              <stop offset="0%" stopColor="rgba(124,58,237,0.35)" />
              <stop offset="100%" stopColor="rgba(6,9,19,0.2)" />
            </radialGradient>
          </defs>
          <path d={OUTLINE} fill="url(#tn-glow)" stroke="rgba(124,58,237,0.55)" strokeWidth="2" strokeLinejoin="round" />
          <path d={OUTLINE} fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth="6" strokeLinejoin="round" />
          {/* zone legend */}
          <g fontSize="11" fill="rgba(233,239,255,0.75)">
            {Object.entries(ZONE_LABEL).map(([z, label], i) => (
              <g key={z} transform={`translate(${12 + i * 92}, ${530})`}>
                <circle cx="6" cy="-4" r="5" fill={ZONE_COLOR[z]} />
                <text x="16" y="0">{label}</text>
              </g>
            ))}
          </g>
          {districts.map((d) => {
            const p = DOTS[d.name];
            if (!p) return null;
            const isActive = d.id === sel;
            const color = ZONE_COLOR[d.zone] ?? '#a78bfa';
            return (
              <g key={d.id} onClick={() => setSel(d.id)} className="cursor-pointer" role="button" aria-label={`Select ${d.name}`}>
                {isActive && <circle cx={p.x} cy={p.y} r="16" fill="none" stroke={color} strokeWidth="2" opacity="0.8" />}
                <circle cx={p.x} cy={p.y} r={isActive ? 8 : 6} fill={color} stroke="#060913" strokeWidth="2">
                  <title>{`${d.name} · ${d.name_tamil}`}</title>
                </circle>
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="10" fontWeight={isActive ? 700 : 500} fill={isActive ? '#f9fbff' : 'rgba(233,239,255,0.85)'}>
                  {d.name}
                </text>
              </g>
            );
          })}
        </svg>
        <p className="mt-2 text-center text-[11px] text-ink-500">Stylized map — tap a district dot to explore its culture, language, food &amp; temples.</p>
      </div>

      {active && (
        <div className="card p-6">
          <div className="flex items-center gap-3">
            <span className="badge" style={{ borderColor: `${ZONE_COLOR[active.zone]}55`, background: `${ZONE_COLOR[active.zone]}22`, color: ZONE_COLOR[active.zone] }}>
              {ZONE_LABEL[active.zone] ?? active.zone}
            </span>
            <span className="text-xs text-ink-500">
              {active.name_tamil}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold text-ink-950">{active.name}</h2>
          {active.famous_for && <p className="mt-1 text-sm font-medium text-brand-300">{active.famous_for}</p>}
          <dl className="mt-5 space-y-4 text-sm">
            {(
              [
                ['🗣️ Language · மொழி', active.language_note],
                ['🏛️ Culture · கலாசாரம்', active.culture],
                ['🍲 Food · உணவு', active.food],
                ['🛕 Temple · கோவில்', active.temple],
                ['🎉 Festival · திருவிழா', active.festival],
              ] as [string, string | null][]
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">{label}</dt>
                  <dd className="mt-0.5 leading-relaxed text-ink-300">{value}</dd>
                </div>
              ) : null
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
