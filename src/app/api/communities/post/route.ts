import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, rateLimit, clientIp, readJson, route } from '@/lib/api';
import { notifyMany } from '@/lib/notifications';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`post:${user.id}`, 10, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Slow down a little — max 10 posts per minute.');
    const { community_id, title, body } = (await readJson(req)) as unknown as { community_id: number; title: string; body: string };
    z.number().int().positive().parse(community_id);
    z.string().trim().min(3).max(200).parse(title);
    z.string().trim().min(3).max(6000).parse(body);
    const db = getDb();

    const membership = db.prepare('SELECT id FROM community_members WHERE community_id = ? AND user_id = ?').get(community_id, user.id);
    if (!membership) throw new ApiError(403, 'Join the community before posting.');

    const res = db.prepare('INSERT INTO posts (community_id, user_id, title, body) VALUES (?,?,?,?)').run(community_id, user.id, title.trim(), body.trim());
    const postId = Number(res.lastInsertRowid);

    // Notify other members (not the author)
    const members = db.prepare('SELECT user_id FROM community_members WHERE community_id = ? AND user_id != ?').all(community_id, user.id) as unknown as { user_id: number }[];
    if (members.length) notifyMany(db, members.map((m) => m.user_id), 'community', `New post in the community`, `${user.name}: ${title}`, null);
    return json({ ok: true, post_id: postId }, 201);
  });
}
