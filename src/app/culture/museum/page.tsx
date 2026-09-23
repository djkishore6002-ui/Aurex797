import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems, toStageItem } from '@/lib/culture';
import { PageHead } from '@/components/ui';
import { HeritageExplorer } from '@/components/HeritageExplorer';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export const metadata: Metadata = {
  title: 'Virtual Cultural Museum · சான்று மனை',
  description:
    'Spin the Chola Nataraja bronze, Thanjavur gold-leaf paintings, Sangam terracotta and the Mahabalipuram stone chariot in 3D.',
};

export default function MuseumPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('சான்று மனை', 'Virtual Cultural Museum', lang);
  const items = getCultureItems(db, ['object', 'craft']).map(toStageItem);

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — from the cosmic dance of the Chola bronzes to gold-leaf Thanjavur paintings and 2,000-year-old terracotta. Pick an object, spin it, zoom in.'
        }
        actions={<span className="badge border border-marigold-400/30 bg-marigold-400/10 text-marigold-200">{items.length} exhibits</span>}
      />
      <HeritageExplorer
        items={items}
        intro={
          lang === 'ta'
            ? 'சோழர் பித்தளை வேலை, தஞ்சாவூர் தங்க ஓவியம், சங்க மண் சிற்பங்கள் — தமிழ் கலையின் நிரந்திர சான்றுகள்.'
            : 'Chola bronzes, Thanjavur gold-leaf painting and Sangam terracotta — the lasting evidence of Tamil art.'
        }
      />
    </div>
  );
}
