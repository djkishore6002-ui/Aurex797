import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems, toStageItem } from '@/lib/culture';
import { MuseumShowcase } from '@/components/MuseumShowcase';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tamil Culture & Heritage · தமிழ் கலாசாரம்',
  description:
    'Explore Tamil culture in 3D: temples, forts, inscriptions, food, festivals, dance, music, dress, regional Tamil, a virtual museum and a culture quiz.',
};

interface ModuleCard {
  href: string;
  icon: string;
  ta: string;
  en: string;
  desc_ta: string;
  desc_en: string;
  count?: number;
}

export default function CultureHub() {
  const db = getDb();
  const lang = getLang();
  const head = bi('தமிழ் கலாசாரம் & பாரம்பரியம்', 'Tamil Culture & Heritage', lang);

  const counts = new Map<string, number>();
  for (const r of db.prepare('SELECT category, COUNT(*) c FROM culture_items WHERE is_published = 1 GROUP BY category').all() as unknown as { category: string; c: number }[]) {
    counts.set(r.category, r.c);
  }
  const districts = (db.prepare('SELECT COUNT(*) c FROM tn_districts').get() as unknown as { c: number }).c;
  const museumItems = getCultureItems(db, ['object', 'craft']).map(toStageItem);

  const modules: ModuleCard[] = [
    { href: '/culture/heritage', icon: '🛕', ta: '3D கோவில் உலா', en: '3D Temple Explorer', desc_ta: 'கோவில்களை சுழற்றி, பெரிதாக்கி பார் — சோழர் கலையின் அருமை.', desc_en: 'Rotate & zoom through 3D temples and forts — Chola art up close.', count: (counts.get('temple') ?? 0) + (counts.get('heritage') ?? 0) },
    { href: '/culture/map', icon: '🗺️', ta: 'தமிழ்நாடு வரைபடம்', en: 'Virtual TN Map', desc_ta: 'மாவட்டங்களை தொட்டால் — மொழி, உணவு, கோவில் தெரியும்.', desc_en: 'Click districts on the map — language, food, temples & festivals.', count: districts },
    { href: '/culture/inscriptions', icon: '🪨', ta: 'கல்வெட்டு உலா', en: 'Inscription Explorer', desc_ta: 'பழைய தமிழ் → இன்றைய பொருள். 2000+ ஆண்டு கல்வெட்டுகள்.', desc_en: 'Old Tamil → modern meaning. 2000+-year-old carvings decoded.', count: counts.get('inscription') },
    { href: '/culture/food', icon: '🍲', ta: 'உணவு உலா', en: 'Food Explorer', desc_ta: 'தமிழ் பெயர், உச்சரிப்பு, பொருட்கள் — தமிழ் உணவு உலகம்.', desc_en: 'Dishes with Tamil names, pronunciation & ingredients.', count: counts.get('food') },
    { href: '/culture/gallery', icon: '🎭', ta: 'கலாசார தொகுப்பு', en: 'Culture Gallery', desc_ta: 'அடவு, இசை, திருவிழா, உடை — அனைத்தும் ஒரே தொகுப்பில்.', desc_en: 'Dance, music, festivals & traditional dress in one gallery.', count: (counts.get('dance') ?? 0) + (counts.get('music') ?? 0) + (counts.get('festival') ?? 0) + (counts.get('dress') ?? 0) },
    { href: '/culture/gallery?cat=music', icon: '🎵', ta: 'தமிழ் இசை மூலை', en: 'Tamil Music Corner', desc_ta: 'கர்நாடகம், பறை, நாதஸ்வரம் — கோவில் இசையின் கதை.', desc_en: 'Carnatic, parai, nadaswaram — the story of temple music.', count: counts.get('music') },
    { href: '/culture/gallery?cat=festival', icon: '🎉', ta: 'திருவிழாக்கள்', en: 'Festivals', desc_ta: 'பொங்கல் முதல் சித்திரை — தமிழ் திருவிழாக்களின் நிறம்.', desc_en: 'Pongal to Chithirai — the colour of Tamil festivals.', count: counts.get('festival') },
    { href: '/culture/gallery?cat=dress', icon: '👗', ta: 'உடை தொகுப்பு', en: 'Dress Gallery', desc_ta: 'காஞிபுரம் சேலை, பாவடை, வெஷ்டி — நெசவின் கதை.', desc_en: 'Kanchipuram silk, pavadai, veshti — woven heritage.', count: counts.get('dress') },
    { href: '/culture/regional', icon: '🗣️', ta: 'மண்டல தமிழ்', en: 'Regional Tamil', desc_ta: 'சென்னை, கொங்கு, மதுரை, நெல்லை — மொழி எப்படி மாறுகிறது.', desc_en: 'Chennai, Kongu, Madurai, Nellai — how Tamil sounds across regions.', count: counts.get('region') },
    { href: '/culture/museum', icon: '🧩', ta: 'சான்று மனை', en: 'Virtual Museum', desc_ta: 'நடராஜர் பித்தளை, தஞ்சாவூர் ஓவியம் — 3D-இல் பார்.', desc_en: 'Nataraja bronze, Thanjavur art — in 3D.', count: (counts.get('object') ?? 0) + (counts.get('craft') ?? 0) },
    { href: '/culture/quiz', icon: '🎮', ta: 'கலாசார வினாடி', en: 'Culture Quiz', desc_ta: '10 கேள்விகள் — புள்ளிகள், சவால், வெற்றி!', desc_en: '10 questions, points, streaks & a victory lap.', count: undefined },
  ];

  return (
    <div className="container-page max-w-6xl py-10">
      {/* Tamil-first hero */}
      <div className="relative mb-10 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/15 via-[#0a0f22] to-cyan-500/10 px-6 py-12 text-center sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(600px_circle_at_20%_10%,rgba(124,58,237,0.35),transparent),radial-gradient(500px_circle_at_85%_85%,rgba(34,211,238,0.25),transparent)]" />
        <p aria-hidden className="text-5xl">🛕</p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-ink-950 sm:text-5xl">{head.main}</h1>
        <p className="mt-2 text-lg font-semibold text-brand-200">{head.sub}</p>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
          {lang === 'ta'
            ? 'கோவில்கள், கல்வெட்டுகள், உணவு, திருவிழாக்கள், ஆடல்-இசை — தமிழ் கலாசாரத்தை 3D-இல், வரைபடத்தில், விளையாட்டில் கண்டறிக.'
            : 'Temples, inscriptions, food, festivals, dance & music — discover Tamil culture in 3D, on a map, and through a game.'}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/culture/heritage" className="btn-primary">🛕 Start the 3D tour</Link>
          <Link href="/culture/quiz" className="btn-ghost">🎮 Take the culture quiz</Link>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="card group p-5 transition hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-glow-lg"
          >
            <div className="flex items-center justify-between">
              <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/25 to-cyan-500/15 text-2xl transition group-hover:scale-110">
                {m.icon}
              </span>
              {typeof m.count === 'number' && (
                <span className="badge border border-white/10 bg-white/5 text-ink-400">{m.count} items</span>
              )}
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink-950">{lang === 'ta' ? m.ta : m.en}</h2>
            <p className="text-sm font-medium text-brand-300">{lang === 'ta' ? m.en : m.ta}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-400">{lang === 'ta' ? m.desc_en : m.desc_ta}</p>
          </Link>
        ))}
      </div>

      {/* Museum 3D showcase */}
      <section className="mt-14" aria-label="Virtual museum showcase">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-ink-950">🧩 {bi('சான்று மனை', 'Virtual Cultural Museum', lang).main}</h2>
            <p className="mt-1 text-sm text-ink-400">
              {bi('நடராஜர், தஞ்சாவூர் ஓவியம், மண் சிற்பிகள் — 3D-இல் சுழற்றி பார்.', 'Nataraja, Thanjavur art, terracotta — spin them in 3D.', lang).sub}
            </p>
          </div>
          <Link href="/culture/museum" className="btn-ghost">Open full museum →</Link>
        </div>
        <MuseumShowcase items={museumItems} />
      </section>
    </div>
  );
}
