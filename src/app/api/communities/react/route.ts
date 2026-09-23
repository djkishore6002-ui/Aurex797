import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { post_id, type } = (await readJson(req)) as unknown as { post_id: number; type: string };
    z.number().int().positive().parse(post_id);
    z.enum(['like', 'helpful', 'celebrate']).parse(type);
    const db = getDb();
    const post = db.prepare('SELECT id FROM posts WHERE id = ? AND deleted_at IS NULL').get(post_id);
    if (!post) throw new ApiError(404, 'Post not found');
    const existing = db.prepare('SELECT id FROM reactions WHERE post_id = ? AND user_id = ? AND type = ?').get(post_id, user.id, type) as unknown as { id: number } | undefined;
    if (existing) {
      db.prepare('DELETE FROM reactions WHERE id = ?').run(existing.id); // toggle off
    } else {
      db.prepare('INSERT INTO reactions (post_id, user_id, type) VALUES (?,?,?)').run(post_id, user.id, type);
    }
    return json({ ok: true });
  });
}
