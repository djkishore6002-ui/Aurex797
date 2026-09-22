import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, route } from '@/lib/api';

export async function POST() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(user.id);
    return json({ ok: true });
  });
}
