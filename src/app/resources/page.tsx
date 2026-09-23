import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { ResourcesBrowser, type ResourceRow } from '@/components/ResourcesBrowser';
import { Reveal } from '@/components/Reveal';
import { getLang, bi } from '@/lib/i18n';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export const metadata: Metadata = {
  title: 'Free Resources · இலவச கற்றல் வளங்கள்',
  description:
    'Free Tamil learning resources: NPTEL video lectures, YouTube videos, reference notes, books and guides from Alison — one organised library.',
};

const PROVIDER_CARDS = [
  {
    icon: '🎓',
    name: 'NPTEL',
    ta: 'நேபிட்டெல்',
    body: '700+ free IIT & IISc certification courses — 174 with Tamil lectures, subtitles and 159 Tamil e-books.',
    taBody: '700+ இலவச IIT வகுப்புகள் — 174 தமிழில், 159 தமிழ் மின்-நூல்களுடன்.',
    href: 'https://nptel.ac.in/courses',
  },
  {
    icon: '▶',
    name: 'YouTube',
    ta: 'யூடியூப்',
    body: 'Hand-picked video lessons: alphabet, vocabulary, conversation — embedded right here, free to watch.',
    taBody: 'எழுத்துக்கள், சொற்கள், உரையாடல் — வீடியோ பாடங்கள் இங்கேயே.',
    href: 'https://www.youtube.com/results?search_query=learn+tamil',
  },
  {
    icon: '📗',
    name: 'Alison',
    ta: 'அலிசன்',
    body: 'Free structured courses with certificates — "Tamil for Beginners" covers the alphabet to conversation.',
    taBody: 'சான்றிதழுடன் இலவச வகுப்புகள் — "Tamil for Beginners" முழுத் திட்டம்.',
    href: 'https://alison.com/course/tamil-for-beginners',
  },
];

export default function ResourcesPage() {
  const db = getDb();
  const lang = getLang();
  const head = bi('இலவச கற்றல் வளங்கள்', 'Free Learning Resources', lang);
  const resources = plainRows<ResourceRow>(
    db.prepare('SELECT * FROM learning_resources WHERE is_published = 1 ORDER BY sort_order, id').all()
  );

  return (
    <div className="container-page max-w-6xl py-10">
      <PageHead
        title={head.main}
        subtitle={
          head.sub +
          ' — videos from NPTEL, YouTube and Alison, recorded live-teaching classes, plus reference notes, books and guides. Everything free, organised in one library.'
        }
        actions={
          <div className="flex items-center gap-2">
            <span className="badge border border-brand-400/30 bg-brand-500/15 text-brand-200">
              {resources.length} resources · {resources.length} வளங்கள்
            </span>
          </div>
        }
      />

      {/* Provider spotlight */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        {PROVIDER_CARDS.map((p, i) => (
          <Reveal key={p.name} delay={i * 90}>
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="card group block p-5 transition hover:-translate-y-0.5 hover:border-brand-400/40 hover:shadow-glow-lg"
          >
            <div className="flex items-center gap-3">
              <span aria-hidden className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500/30 to-cyan-500/20 text-xl">
                {p.icon}
              </span>
              <div>
                <p className="text-sm font-bold text-ink-950">
                  {p.name} <span className="font-medium text-brand-300">· {p.ta}</span>
                </p>
                <p className="text-[11px] text-ink-500">Free · {lang === 'en' ? 'தமிழ் + English' : 'தமிழ் + English'}</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-400">{lang === 'en' ? p.body : p.taBody}</p>
            <p className="mt-1 text-[11px] text-ink-500">{lang === 'en' ? p.taBody : p.body}</p>
          </a>
          </Reveal>
        ))}
      </div>

      <ResourcesBrowser resources={resources} />

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-4">
        <p className="text-sm text-ink-400">
          Want to learn while you browse? <Link href="/learn" className="font-semibold text-brand-300 hover:underline">Start a free course →</Link>
        </p>
        <p className="text-xs text-ink-500">All external links open in a new tab. NPTEL, YouTube &amp; Alison are independent, free platforms.</p>
      </div>
    </div>
  );
}
