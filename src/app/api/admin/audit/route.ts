import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { json, route } from '@/lib/api';

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const params = new URL(req.url).searchParams;
    const q = (params.get('q') ?? '').trim();
    const limit = Math.min(500, Math.max(10, Number(params.get('limit') ?? 200)));
    const db = getDb();
    const logs = db
      .prepare(
        `SELECT * FROM audit_logs
         WHERE (? = '' OR action LIKE ? OR entity LIKE ? OR actor_email LIKE ?)
         ORDER BY id DESC LIMIT ?`
      )
      .all(q, `%${q}%`, `%${q}%`, `%${q}%`, limit);
    const actions = db.prepare('SELECT action, COUNT(*) c FROM audit_logs GROUP BY action ORDER BY c DESC LIMIT 20').all();
    return json({ logs, actions });
  });
}
