import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { getSettings, getHomepageSections, getAllFaq, getNav, getFooterLinks, getBanners } from '@/lib/cms';
import { safeJsonText } from '@/lib/ai/knowledge';
import { CmsAdmin } from './cms-admin';

export const dynamic = 'force-dynamic';

export default function AdminCmsPage() {
  const db = getDb();
  const settings = getSettings(db);
  const sections = plainRows<{ id: number; key: string; type: string; title: string | null; body_json: string; is_published: number }>(getHomepageSections(db)).map((s) => ({ ...s, body: safeJsonText(s.body_json) as unknown as Record<string, unknown> }));
  const faqs = plainRows<{ id: number; question: string; answer: string; category: string; is_published: number }>(getAllFaq(db));
  const nav = plainRows<{ id: number; label: string; href: string }>(getNav(db, 'header').concat(getNav(db, 'mobile'))).map((n) => ({ id: n.id, label: n.label, href: n.href }));
  const footer = plainRows<{ id: number; column_label: string; label: string; href: string }>(getFooterLinks(db));
  const banners = plainRows<{ id: number; title: string; body: string | null; link_url: string | null; link_label: string | null; is_active: number }>(getBanners(db));
  const pages = db.prepare('SELECT id, slug, title, body_json, is_published FROM static_pages ORDER BY id').all() as unknown as { id: number; slug: string; title: string; body_json: string; is_published: number }[];

  return (
    <div>
      <PageHead title="Website CMS" subtitle="Everything visitors see is database-driven: site text, hero, homepage sections, pages, FAQ, navigation, footer and banners. No source code changes needed." />
      <CmsAdmin
        settings={settings}
        sections={sections}
        faqs={faqs}
        nav={nav}
        footer={footer}
        banners={banners}
        pages={pages.map((p) => ({ id: p.id, slug: p.slug, title: p.title, is_published: p.is_published === 1, blocks: safeJsonText(p.body_json) }))}
      />
    </div>
  );
}
