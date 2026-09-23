import type { DB } from '@/db';

export interface SearchFilters {
  type?: 'course' | 'lesson' | 'workshop' | 'vocabulary' | 'faq' | 'community' | 'announcement';
  level?: string;
  price?: 'free' | 'paid';
}

export interface SearchResult {
  type: string;
  title: string;
  subtitle: string | null;
  href: string;
  extra: string | null;
}

/** Global search across platform content (SQL LIKE based; Postgres FTS upgrade documented in README). */
export function globalSearch(db: DB, q: string, filters: SearchFilters = {}, limit = 30): { results: SearchResult[]; counts: Record<string, number> } {
  const term = `%${q.replace(/[%_]/g, '')}%`;
  const want = (t: string) => !filters.type || filters.type === t;
  const results: SearchResult[] = [];
  const counts: Record<string, number> = {};

  if (want('course')) {
    const rows = db
      .prepare(
        `SELECT slug, title, subtitle, difficulty, level_tag, price_cents FROM courses
         WHERE is_published = 1 AND deleted_at IS NULL AND (title LIKE ? OR subtitle LIKE ? OR description LIKE ? OR level_tag LIKE ?)
         ${filters.level ? 'AND difficulty = ?' : ''} ${filters.price ? 'AND price_cents ' + (filters.price === 'free' ? '= 0' : '> 0') : ''}
         LIMIT 20`
      )
      .all(...[term, term, term, term, ...(filters.level ? [filters.level] : [])]) as unknown as { slug: string; title: string; subtitle: string | null; difficulty: string; level_tag: string | null; price_cents: number }[];
    counts.course = rows.length;
    for (const r of rows) results.push({ type: 'course', title: r.title, subtitle: r.subtitle, href: `/learn/${r.slug}`, extra: `${r.level_tag ?? r.difficulty} · ${r.price_cents === 0 ? 'Free' : '₹' + r.price_cents / 100}` });
  }
  if (want('lesson')) {
    const rows = db
      .prepare(
        `SELECT l.slug, l.title, l.summary, c.slug AS course_slug, c.title AS course_title
         FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
         WHERE l.is_published = 1 AND c.is_published = 1 AND (l.title LIKE ? OR l.summary LIKE ? OR l.transcript_text LIKE ?) LIMIT 20`
      )
      .all(term, term, term) as unknown as { slug: string; title: string; summary: string | null; course_slug: string; course_title: string }[];
    counts.lesson = rows.length;
    for (const r of rows) results.push({ type: 'lesson', title: r.title, subtitle: r.summary, href: `/learn/${r.course_slug}/${r.slug}`, extra: `Lesson · ${r.course_title}` });
  }
  if (want('workshop')) {
    const rows = db
      .prepare(
        `SELECT slug, title, description, starts_at, price_cents FROM workshops
         WHERE is_published = 1 AND deleted_at IS NULL AND (title LIKE ? OR description LIKE ?)
         ${filters.price ? 'AND price_cents ' + (filters.price === 'free' ? '= 0' : '> 0') : ''}
         LIMIT 20`
      )
      .all(...[term, term, ...(filters.price ? [] : [])]) as unknown as { slug: string; title: string; description: string | null; starts_at: string; price_cents: number }[];
    counts.workshop = rows.length;
    for (const r of rows) results.push({ type: 'workshop', title: r.title, subtitle: r.description?.slice(0, 120) ?? null, href: `/workshops/${r.slug}`, extra: `Workshop · ${r.price_cents === 0 ? 'Free' : '₹' + r.price_cents / 100}` });
  }
  if (want('vocabulary')) {
    const rows = db
      .prepare(`SELECT id, tamil, transliteration, meaning FROM vocabulary WHERE is_published = 1 AND (tamil LIKE ? OR transliteration LIKE ? OR meaning LIKE ?) LIMIT 20`)
      .all(term, term, term) as unknown as { id: number; tamil: string; transliteration: string; meaning: string }[];
    counts.vocabulary = rows.length;
    for (const r of rows) results.push({ type: 'vocabulary', title: `${r.tamil} (${r.transliteration})`, subtitle: r.meaning, href: `/vocabulary?q=${encodeURIComponent(r.tamil)}`, extra: 'Vocabulary' });
  }
  if (want('faq')) {
    const rows = db.prepare(`SELECT id, question, answer, category FROM faq_entries WHERE is_published = 1 AND (question LIKE ? OR answer LIKE ?) LIMIT 10`).all(term, term) as unknown as { id: number; question: string; answer: string; category: string }[];
    counts.faq = rows.length;
    for (const r of rows) results.push({ type: 'faq', title: r.question, subtitle: r.answer.slice(0, 140), href: '/faq', extra: `FAQ · ${r.category}` });
  }
  if (want('community')) {
    const rows = db.prepare(`SELECT slug, name, description FROM communities WHERE deleted_at IS NULL AND (name LIKE ? OR description LIKE ?) LIMIT 10`).all(term, term) as unknown as { slug: string; name: string; description: string | null }[];
    counts.community = rows.length;
    for (const r of rows) results.push({ type: 'community', title: r.name, subtitle: r.description, href: `/community/${r.slug}`, extra: 'Community' });
  }
  if (want('announcement')) {
    const rows = db.prepare(`SELECT id, title, body FROM announcements WHERE is_published = 1 AND deleted_at IS NULL AND (title LIKE ? OR body LIKE ?) LIMIT 10`).all(term, term) as unknown as { id: number; title: string; body: string }[];
    counts.announcement = rows.length;
    for (const r of rows) results.push({ type: 'announcement', title: r.title, subtitle: r.body.slice(0, 140), href: '/dashboard#announcements', extra: 'Announcement' });
  }

  return { results: results.slice(0, limit), counts };
}
