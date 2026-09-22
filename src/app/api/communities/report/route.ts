import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, rateLimit, clientIp, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`report:${clientIp(req)}`, 5, 60_000);
    if (!rl.ok) throw new Error('Too many reports');
    const { target_type, target_id, reason } = (await readJson(req)) as unknown as { target_type: string; target_id: number; reason: string };
    z.enum(['post', 'comment', 'user']).parse(target_type);
    z.number().int().positive().parse(target_id);
    z.string().trim().min(5).max(500).parse(reason);
    const db = getDb();
    db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?,?,?,?)').run(user.id, target_type, target_id, reason.trim());
    // Notify super admins
    const admins = db.prepare("SELECT id FROM users WHERE role = 'super_admin' AND is_active = 1").all() as unknown as { id: number }[];
    for (const a of admins) {
      db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)').run(
        a.id,
        'system',
        'New community report',
        `${target_type}: "${reason.slice(0, 100)}"`,
        '/admin/communities'
      );
    }
    return json({ ok: true }, 201);
  });
}
