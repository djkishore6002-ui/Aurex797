import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getLang, bi } from '@/lib/i18n';
import { getCultureItems, toStageItem } from '@/lib/culture';
import { PageHead } from '@/components/ui';
import { HeritageExplorer } from '@/components/HeritageExplorer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '3D Temple & Heritage Explorer · 3D கோவில் உலா',
  description:
    'A working 3D explorer of Tamil temples and forts — drag to rotate, scroll to zoom. Brihadeeswarar, Meenakshi, Rameswaram, Chola & Pallava monuments, forts of Vellore.',
};

export default function HeritagePage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('3D கோவில் & பாரம்பரிய உலா', '3D Temple & Heritage Explorer', lang);
  const items = getCultureItems(db, ['temple', 'heritage']).map(toStageItem);

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — drag to rotate, scroll or use buttons to zoom. UNESCO sites, Chola engineering and living temples, all in one 3D stage.'
        }
        actions={
          <span className="badge border border-brand-400/30 bg-brand-500/15 text-brand-200">
            {items.length} monuments · {items.length} நினைவுகள்
          </span>
        }
      />
      <HeritageExplorer
        items={items}
        intro={
          lang === 'ta'
            ? 'தமிழ் கோவில்கள் உலகின் மிகப்பெரிய கட்டடக் கலையில் ஒன்று. சோழர் காலத்தில் 66 மீட்டர் விமானம் உலகின் உயர்ந்த கட்டடமாக இருந்தது.'
            : 'Tamil temples are among the greatest architectural achievements in the world. In the Chola age, a 66-metre vimana was the tallest structure on Earth.'
        }
      />
    </div>
  );
}
