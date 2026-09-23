import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { notify } from '@/lib/notifications';

/**
 * Workshop registration.
 * FREE workshops → CONFIRMED immediately.
 * PAID workshops → PENDING until a payment provider marks it PAID.
 * We never fake a successful payment.
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { workshop_id } = (await readJson(req)) as unknown as { workshop_id: number };
    z.number().int().positive().parse(workshop_id);
    const db = getDb();

    const w = db.prepare('SELECT * FROM workshops WHERE id = ? AND is_published = 1 AND deleted_at IS NULL').get(workshop_id) as
      | { id: number; title: string; price_cents: number; capacity: number; registration_deadline: string | null }
      | undefined;
    if (!w) throw new ApiError(404, 'Workshop not found');
    if (w.registration_deadline && new Date(w.registration_deadline).getTime() < Date.now()) throw new ApiError(400, 'The registration deadline has passed.');

    const seats = (db.prepare("SELECT COUNT(*) AS c FROM workshop_registrations WHERE workshop_id = ? AND status IN ('CONFIRMED','PAID')").get(workshop_id) as unknown as { c: number }).c;
    if (seats >= w.capacity) throw new ApiError(400, 'This workshop is full.');

    const existing = db.prepare('SELECT id, status FROM workshop_registrations WHERE user_id = ? AND workshop_id = ?').get(user.id, workshop_id) as unknown as { id: number; status: string } | undefined;
    if (existing) {
      if (['CONFIRMED', 'PAID'].includes(existing.status)) return json({ ok: true, already: true, status: existing.status });
      if (existing.status === 'PENDING') return json({ ok: true, status: 'PENDING' });
      db.prepare("UPDATE workshop_registrations SET status = 'CONFIRMED', updated_at = datetime('now') WHERE id = ?").run(existing.id);
      return json({ ok: true, status: 'CONFIRMED' });
    }

    const status = w.price_cents > 0 ? 'PENDING' : 'CONFIRMED';
    db.prepare('INSERT INTO workshop_registrations (workshop_id, user_id, status) VALUES (?,?,?)').run(workshop_id, user.id, status);
    notify(db, user.id, 'workshop', status === 'CONFIRMED' ? 'Registration confirmed ✅' : 'Registration pending payment', `You registered for “${w.title}”.`, `/workshops/`);
    return json({ ok: true, status }, 201);
  });
}
