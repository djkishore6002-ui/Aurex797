/**
 * Content for the 3D stage: a layered glass card. Each layer sits at a
 * different translateZ so rotating the stage reveals real depth.
 */
export interface StageItem {
  id: number;
  title: string;
  title_tamil: string;
  subtitle: string | null;
  era: string | null;
  region: string | null;
  description: string | null;
  icon: string;
  accent: string;
  facts: { l: string; v: string }[];
}

export function CultureStageCard({ item }: { item: StageItem }) {
  return (
    <div
      className="relative h-[300px] w-[250px] sm:h-[340px] sm:w-[280px]"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {/* back glow panel */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-b from-brand-500/25 via-white/5 to-cyan-500/15 backdrop-blur-sm"
        style={{ transform: 'translateZ(-40px)' }}
      />
      {/* mid panel */}
      <div
        className="absolute inset-3 rounded-2xl border border-white/15 bg-[#0a0f22]/90 shadow-2xl"
        style={{ transform: 'translateZ(0px)' }}
      />
      {/* icon layer */}
      <div
        className="absolute inset-x-0 top-6 grid place-items-center"
        style={{ transform: 'translateZ(55px)' }}
      >
        <span aria-hidden className="text-6xl drop-shadow-[0_0_25px_rgba(124,58,237,0.65)]">
          {item.icon}
        </span>
      </div>
      {/* text layer */}
      <div
        className="absolute inset-x-4 top-[104px] bottom-4 text-center"
        style={{ transform: 'translateZ(35px)' }}
      >
        <p className="text-2xl font-bold leading-tight text-ink-950">{item.title_tamil}</p>
        <p className="mt-1 text-sm font-semibold text-brand-200">{item.title}</p>
        {item.subtitle && <p className="mt-1 text-[11px] text-ink-400">{item.subtitle}</p>}
        {item.era && (
          <span className="mt-2 inline-block rounded-full border border-marigold-400/30 bg-marigold-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-marigold-200">
            {item.era}
          </span>
        )}
        <div className="mt-3 space-y-1 border-t border-white/10 pt-2">
          {item.facts.slice(0, 3).map((f) => (
            <p key={f.l} className="text-left text-[10px] leading-snug text-ink-300">
              <span className="font-semibold text-brand-300">{f.l}</span> · {f.v}
            </p>
          ))}
        </div>
      </div>
      {/* floating accent orb */}
      <div
        aria-hidden
        className="absolute -right-2 top-4 h-10 w-10 rounded-full bg-gradient-to-br from-marigold-400/50 to-brand-500/50 blur-[2px]"
        style={{ transform: 'translateZ(70px)' }}
      />
    </div>
  );
}
