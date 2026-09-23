import type { DB } from '@/db';
import { CATEGORY_ICON } from './culture-meta';
import type { StageItem } from '@/components/CultureStageCard';

export interface CultureItem {
  id: number;
  category: string;
  slug: string;
  title: string;
  title_tamil: string;
  subtitle: string | null;
  subtitle_tamil: string | null;
  meaning: string | null;
  meaning_tamil: string | null;
  description: string | null;
  description_tamil: string | null;
  region: string | null;
  era: string | null;
  facts: { l: string; v: string }[];
  icon: string;
  sort_order: number;
}

function safeFacts(json: string): { l: string; v: string }[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function getCultureItems(db: DB, categories?: string[]): CultureItem[] {
  const rows = categories
    ? db
        .prepare(`SELECT * FROM culture_items WHERE is_published = 1 AND category IN (${categories.map(() => '?').join(',')}) ORDER BY sort_order, id`)
        .all(...categories)
    : db.prepare('SELECT * FROM culture_items WHERE is_published = 1 ORDER BY category, sort_order, id').all();
  return (rows as unknown as Record<string, unknown>[]).map((r) => ({
    id: Number(r.id),
    category: String(r.category),
    slug: String(r.slug),
    title: String(r.title),
    title_tamil: String(r.title_tamil),
    subtitle: (r.subtitle as string | null) ?? null,
    subtitle_tamil: (r.subtitle_tamil as string | null) ?? null,
    meaning: (r.meaning as string | null) ?? null,
    meaning_tamil: (r.meaning_tamil as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    description_tamil: (r.description_tamil as string | null) ?? null,
    region: (r.region as string | null) ?? null,
    era: (r.era as string | null) ?? null,
    facts: safeFacts(String(r.facts_json ?? '[]')),
    icon: CATEGORY_ICON[String(r.category)] ?? '🏛️',
    sort_order: Number(r.sort_order ?? 0),
  }));
}

export function toStageItem(c: CultureItem): StageItem {
  return {
    id: c.id,
    title: c.title,
    title_tamil: c.title_tamil,
    subtitle: c.subtitle,
    era: c.era,
    region: c.region,
    description: c.description,
    icon: c.icon,
    accent: '',
    facts: c.facts,
  };
}
