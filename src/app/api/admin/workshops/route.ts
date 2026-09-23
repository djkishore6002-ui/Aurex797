import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route } from '@/lib/api';
import { audit, saveVersion } from '@/lib/audit';
import { indexSource } from '@/lib/ai/knowledge';
import { notifyMany } from '@/lib/notifications';

const fields = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional().nullable(),
  instructor_id: z.number().int().nullable().optional(),
  organizer_id: z.number().int().nullable().optional(),
  starts_at: z.string().min(10).optional(),
  duration_minutes: z.number().int().min(15).max(600).optional(),
  capacity: z.number().int().min(1).max(5000).optional(),
  meeting_url: z.string().url().max(500).nullable().optional(),
  price_cents: z.number().int().min(0).max(10_000_000).optional(),
  registration_deadline: z.string().nullable().optional(),
  certificate_enabled: z.number().int().min(0).max(1).optional(),
  is_published: z.number().int().min(0).max(1).optional(),
});

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const data = fields.parse(await readJson(req));
    const db = getDb();
    const slug = uniqueSlug(data.title, (s) => !!db.prepare('SELECT id FROM workshops WHERE slug = ?').get(s));
    const starts = new Date(data.starts_at ?? Date.now() + 7 * 86400_000).toISOString();
    const duration = data.duration_minutes ?? 60;
    const res = db
      .prepare(
        `INSERT INTO workshops (slug, title, description, instructor_id, organizer_id, starts_at, duration_minutes, capacity, meeting_url, price_cents, registration_deadline, certificate_enabled, is_published)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0)`
      )
      .run(slug, data.title, data.description ?? null, data.instructor_id ?? null, data.organizer_id ?? null, starts, duration, data.capacity ?? 100, data.meeting_url ?? null, data.price_cents ?? 0, data.registration_deadline ?? null, data.certificate_enabled ?? 1);
    const workshopId = Number(res.lastInsertRowid);
    // Default: single session with 90% required minutes
    db.prepare('INSERT INTO workshop_sessions (workshop_id, title, starts_at, duration_minutes, required_minutes) VALUES (?,?,?,?,?)').run(
      workshopId, 'Session 1', starts, duration, Math.round(duration * 0.9)
    );
    saveVersion('workshop', workshopId, data, admin.id);
    audit(admin, 'ADMIN_CREATED_WORKSHOP', { entity: 'workshop', entity_id: workshopId, next: { title: data.title }, ip: clientIp(req) });
    return json({ ok: true, id: workshopId, slug }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { workshop_id: number } & Record<string, unknown>;
    const id = z.number().int().positive().parse(body.workshop_id);
    const db = getDb();
    const w = db.prepare('SELECT * FROM workshops WHERE id = ? AND deleted_at IS NULL').get(id) as unknown as Record<string, unknown> & { id: number; title: string } | undefined;
    if (!w) throw new ApiError(404, 'Workshop not found');
    const prev = { title: w.title, is_published: w.is_published };

    if (body.action === 'unpublish') {
      db.prepare('UPDATE workshops SET is_published = 0 WHERE id = ?').run(id);
      audit(admin, 'ADMIN_UNPUBLISHED_WORKSHOP', { entity: 'workshop', entity_id: id, prev, ip: clientIp(req) });
      return json({ ok: true });
    }
    if (body.action === 'delete') {
      db.prepare("UPDATE workshops SET deleted_at = datetime('now'), is_published = 0 WHERE id = ?").run(id);
      audit(admin, 'ADMIN_DELETED_WORKSHOP', { entity: 'workshop', entity_id: id, prev, ip: clientIp(req) });
      return json({ ok: true });
    }

    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [key, schema] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        let value: unknown = schema.parse(body[key]);
        if (key === 'starts_at') value = new Date(String(value)).toISOString();
        sets.push(`${key} = ?`);
        params.push(value as string | number | null);
      }
    }
    if (sets.length) db.prepare(`UPDATE workshops SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);

    const updated = db.prepare('SELECT * FROM workshops WHERE id = ?').get(id) as unknown as Record<string, unknown> & { id: number; title: string; description: string | null };
    const sessions = db.prepare('SELECT title, starts_at, duration_minutes FROM workshop_sessions WHERE workshop_id = ?').all(id) as unknown as { title: string; starts_at: string; duration_minutes: number }[];
    indexSource(db, 'workshop', id, `Workshop: ${updated.title}`, [updated.description, sessions.map((s) => `Session: ${s.title} on ${s.starts_at} UTC for ${s.duration_minutes} minutes`).join('\n')].filter(Boolean).join('\n'));

    saveVersion('workshop', id, { ...prev, ...body }, admin.id);
    audit(admin, 'ADMIN_UPDATED_WORKSHOP', { entity: 'workshop', entity_id: id, prev, next: body, ip: clientIp(req) });

    // Notify registered learners about changes
    if (body.title !== undefined || body.starts_at !== undefined || body.meeting_url !== undefined) {
      const users = db.prepare("SELECT user_id FROM workshop_registrations WHERE workshop_id = ? AND status IN ('CONFIRMED','PAID')").all(id) as unknown as { user_id: number }[];
      if (users.length) notifyMany(db, users.map((u) => u.user_id), 'workshop', 'Workshop updated', `“${updated.title}” was updated by the organizer.`, null);
    }
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { workshop_id } = (await readJson(req)) as unknown as { workshop_id: number };
    const id = z.number().int().positive().parse(workshop_id);
    const db = getDb();
    const w = db.prepare('SELECT id, title FROM workshops WHERE id = ? AND deleted_at IS NULL').get(id) as unknown as { id: number; title: string } | undefined;
    if (!w) throw new ApiError(404, 'Workshop not found');
    db.prepare("UPDATE workshops SET deleted_at = datetime('now'), is_published = 0 WHERE id = ?").run(id);
    audit(admin, 'ADMIN_DELETED_WORKSHOP', { entity: 'workshop', entity_id: id, prev: { title: w.title }, ip: clientIp(req) });
    return json({ ok: true });
  });
}

/** Workshop sessions management */
export async function PATCH(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { workshop_id: number; add_session?: { title: string; starts_at: string; duration_minutes: number } | null; delete_session_id?: number | null };
    const id = z.number().int().positive().parse(body.workshop_id);
    const db = getDb();
    if (!db.prepare('SELECT id FROM workshops WHERE id = ? AND deleted_at IS NULL').get(id)) throw new ApiError(404, 'Workshop not found');
    if (body.add_session) {
      const s = body.add_session;
      const duration = z.number().int().min(15).max(600).parse(s.duration_minutes);
      const res = db.prepare('INSERT INTO workshop_sessions (workshop_id, title, starts_at, duration_minutes, required_minutes) VALUES (?,?,?,?,?)').run(
        id, z.string().trim().min(2).max(160).parse(s.title), new Date(s.starts_at).toISOString(), duration, Math.round(duration * 0.9)
      );
      audit(admin, 'ADMIN_ADDED_WORKSHOP_SESSION', { entity: 'workshop', entity_id: id, next: { session: s } });
      return json({ ok: true, session_id: Number(res.lastInsertRowid) });
    }
    if (body.delete_session_id) {
      const sid = z.number().int().positive().parse(body.delete_session_id);
      db.prepare('DELETE FROM workshop_sessions WHERE id = ? AND workshop_id = ?').run(sid, id);
      audit(admin, 'ADMIN_DELETED_WORKSHOP_SESSION', { entity: 'workshop', entity_id: id, next: { session_id: sid } });
      return json({ ok: true });
    }
    return json({ ok: true });
  });
}

function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'workshop';
  let slug = clean;
  let i = 2;
  while (exists(slug)) slug = `${clean}-${i++}`;
  return slug;
}
