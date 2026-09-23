import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { getStaticPage } from '@/lib/cms';
import { Blocks } from './Blocks';
import { EmptyState } from './ui';

/**
 * CMS static page renderer — content lives in the database (static_pages),
 * fully editable by the Super Admin at /admin/cms.
 */
export function CmsPage({ slug, fallbackTitle }: { slug: string; fallbackTitle: string }) {
  const db = getDb();
  const page = getStaticPage(db, slug);
  if (!page) {
    return (
      <div className="container-page py-14">
        <EmptyState icon="📄" title="Page coming soon" body="This page is managed from the admin CMS and has not been published yet." />
      </div>
    );
  }
  let blocks: unknown = [];
  try {
    blocks = JSON.parse(page.body_json);
  } catch {
    blocks = [];
  }
  void fallbackTitle;
  return (
    <div className="container-page max-w-3xl py-12">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{page.title}</h1>
      <Blocks blocks={blocks} />
    </div>
  );
}
