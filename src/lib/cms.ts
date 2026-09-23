import type { DB } from '@/db';
import { getDb } from '@/db';

/* CMS — database-driven site content. Nothing below is hard-coded in
   React components; the Super Admin edits all of it at /admin/cms. */

export interface SiteSettings {
  site_name: string;
  tagline: string;
  description: string;
  contact_email: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_href: string;
  accent: string;
  certificate_threshold: number;
  ai_tutor_enabled: boolean;
  [key: string]: unknown;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'Solai',
  tagline: 'சோலை — The Tamil Learning Garden',
  description: 'Learn Tamil through structured courses, live workshops, an AI tutor and a warm learner community. For beginners, travellers, professionals and the Tamil diaspora.',
  contact_email: 'hello@solai.example',
  hero_title: 'Learn Tamil, blooming step by step',
  hero_subtitle: 'Structured courses, live workshops, an AI Tamil tutor and a community garden of learners — from your very first அ to fluent conversation.',
  hero_cta_label: 'Start learning free',
  hero_cta_href: '/learn',
  accent: 'emerald',
  certificate_threshold: 90,
  ai_tutor_enabled: true,
};

export function getSettings(db: DB = getDb()): SiteSettings {
  const rows = db.prepare('SELECT key, value FROM site_settings').all() as unknown as { key: string; value: string }[];
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows) {
    try {
      merged[r.key] = JSON.parse(r.value);
    } catch {
      merged[r.key] = r.value;
    }
  }
  return merged as SiteSettings;
}

export function setSetting(db: DB, key: string, value: unknown): void {
  db.prepare('INSERT INTO site_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, JSON.stringify(value));
}

export interface NavItem {
  id: number;
  label: string;
  href: string;
}

export function getNav(db: DB, location: 'header' | 'footer' | 'mobile'): NavItem[] {
  return (db.prepare('SELECT id, label, href FROM navigation_items WHERE location = ? AND is_published = 1 ORDER BY sort_order').all(location) as unknown as NavItem[]) || [];
}

export function getFooterLinks(db: DB): { id: number; column_label: string; label: string; href: string }[] {
  return (db.prepare('SELECT id, column_label, label, href FROM footer_links WHERE is_published = 1 ORDER BY sort_order').all() as unknown as { id: number; column_label: string; label: string; href: string }[]) || [];
}

export interface HomepageSection {
  id: number;
  key: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  body_json: string;
  sort_order: number;
  is_published: number;
}

export function getHomepageSections(db: DB): HomepageSection[] {
  return (db.prepare('SELECT * FROM homepage_sections WHERE is_published = 1 ORDER BY sort_order').all() as unknown as HomepageSection[]) || [];
}

export function getBanners(db: DB) {
  return (db.prepare('SELECT id, title, body, image_url, link_url, link_label, is_active FROM banners WHERE is_active = 1 ORDER BY sort_order').all() as unknown as { id: number; title: string; body: string | null; image_url: string | null; link_url: string | null; link_label: string | null; is_active: number }[]) || [];
}

export function getFaq(db: DB) {
  return (db.prepare('SELECT id, question, answer, category, is_published FROM faq_entries WHERE is_published = 1 ORDER BY sort_order').all() as unknown as { id: number; question: string; answer: string; category: string; is_published: number }[]) || [];
}

/** All FAQs including drafts (admin). */
export function getAllFaq(db: DB) {
  return (db.prepare('SELECT id, question, answer, category, is_published FROM faq_entries ORDER BY sort_order').all() as unknown as { id: number; question: string; answer: string; category: string; is_published: number }[]) || [];
}

export function getStaticPage(db: DB, slug: string) {
  return db.prepare('SELECT * FROM static_pages WHERE slug = ? AND is_published = 1').get(slug) as unknown as { id: number; slug: string; title: string; body_json: string; updated_at: string } | undefined;
}
