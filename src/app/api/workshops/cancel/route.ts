import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { workshop_id } = (await readJson(req)) as unknown as { workshop_id: number };
    z.number().int().positive().parse(workshop_id);
    const db = getDb();
    const reg = db.prepare('SELECT id, status FROM workshop_registrations WHERE user_id = ? AND workshop_id = ?').get(user.id, workshop_id) as unknown as { id: number; status: string } | undefined;
    if (!reg) throw new ApiError(404, 'Registration not found');
    if (reg.status === 'PAID') throw new ApiError(400, 'Paid registrations must be refunded by the organizer before cancellation.');
    db.prepare("UPDATE workshop_registrations SET status = 'CANCELLED', updated_at = datetime('now') WHERE id = ?").run(reg.id);
    return json({ ok: true });
  });
}
