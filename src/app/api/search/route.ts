import { getDb } from '@/db';
import { json, route } from '@/lib/api';
import { globalSearch } from '@/lib/search';

export async function GET(req: Request) {
  return route(async () => {
    const params = new URL(req.url).searchParams;
    const q = (params.get('q') ?? '').trim();
    if (!q) return json({ results: [], counts: {} });
    const db = getDb();
    const type = (params.get('type') as unknown as 'course' | 'lesson' | 'workshop' | 'vocabulary' | 'faq' | 'community' | 'announcement' | null) ?? undefined;
    const level = params.get('level') ?? undefined;
    const price = (params.get('price') as unknown as 'free' | 'paid' | null) ?? undefined;
    const { results, counts } = globalSearch(db, q.slice(0, 80), { type, level, price });
    return json({ results, counts });
  });
}
