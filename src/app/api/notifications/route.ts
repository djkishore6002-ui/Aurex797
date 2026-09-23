import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, route } from '@/lib/api';

export async function GET() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    const items = db
      .prepare('SELECT id, category, title, body, link_url, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30')
      .all(user.id);
    const unread = (db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0').get(user.id) as unknown as { c: number }).c;
    return json({ items, unread });
  });
}
