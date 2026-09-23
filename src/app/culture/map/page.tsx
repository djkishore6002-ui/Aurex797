import type { Metadata } from 'next';
import { getDb, plainRows } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { PageHead } from '@/components/ui';
import { TnMap, type DistrictRow } from '@/components/TnMap';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export const metadata: Metadata = {
  title: 'Virtual Tamil Nadu Map · தமிழ்நாடு வரைபடம்',
  description:
    'Click a district on the virtual Tamil Nadu map to discover its culture, language, food, temples and festivals.',
};

export default function MapPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('இணைய தமிழ்நாடு வரைபடம்', 'Virtual Tamil Nadu Map', lang);
  const districts = plainRows<DistrictRow>(db.prepare('SELECT * FROM tn_districts ORDER BY sort_order').all());

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — every district speaks a slightly different Tamil, eats a little differently, and celebrates its own festivals. Tap around and find out.'
        }
        actions={
          <span className="badge border border-brand-400/30 bg-brand-500/15 text-brand-200">
            {districts.length} districts · {districts.length} மாவட்டங்கள்
          </span>
        }
      />
      <TnMap districts={districts} />
    </div>
  );
}
