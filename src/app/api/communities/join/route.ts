import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { community_id } = (await readJson(req)) as unknown as { community_id: number };
    z.number().int().positive().parse(community_id);
    const db = getDb();
    const c = db.prepare('SELECT id FROM communities WHERE id = ? AND deleted_at IS NULL').get(community_id);
    if (!c) throw new ApiError(404, 'Community not found');
    const existing = db.prepare('SELECT id FROM community_members WHERE community_id = ? AND user_id = ?').get(community_id, user.id);
    if (existing) return json({ ok: true, already: true });
    db.prepare('INSERT INTO community_members (community_id, user_id, role) VALUES (?,?,\'member\')').run(community_id, user.id);
    return json({ ok: true }, 201);
  });
}
