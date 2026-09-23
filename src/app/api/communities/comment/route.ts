import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, rateLimit, clientIp, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`comment:${user.id}`, 20, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Slow down a little.');
    const { post_id, body } = (await readJson(req)) as unknown as { post_id: number; body: string };
    z.number().int().positive().parse(post_id);
    z.string().trim().min(1).max(3000).parse(body);
    const db = getDb();
    const post = db.prepare('SELECT user_id FROM posts WHERE id = ? AND deleted_at IS NULL').get(post_id) as unknown as { user_id: number } | undefined;
    if (!post) throw new ApiError(404, 'Post not found');
    db.prepare('INSERT INTO comments (post_id, user_id, body) VALUES (?,?,?)').run(post_id, user.id, body.trim());
    if (post.user_id !== user.id) {
      db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)').run(
        post.user_id,
        'community',
        'New comment on your post',
        `${user.name}: ${body.trim().slice(0, 120)}`,
        null
      );
    }
    return json({ ok: true }, 201);
  });
}
