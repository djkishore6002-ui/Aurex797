import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { notifyMany } from '@/lib/notifications';

const fields = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(5000),
  scope: z.enum(['global', 'course', 'workshop', 'community', 'user']).optional(),
  target_id: z.number().int().nullable().optional(),
  is_published: z.number().int().min(0).max(1).optional(),
  publish_at: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin', 'organizer');
    const data = fields.parse(await readJson(req));
    const db = getDb();
    const published = data.is_published === 1;
    const res = db
      .prepare('INSERT INTO announcements (title, body, scope, target_id, is_published, publish_at, created_by) VALUES (?,?,?,?,?,?,?)')
      .run(data.title, data.body, data.scope ?? 'global', data.target_id ?? null, published ? 1 : 0, data.publish_at ?? null, admin.id);
    const annId = Number(res.lastInsertRowid);
    audit(admin, 'ADMIN_CREATED_ANNOUNCEMENT', { entity: 'announcement', entity_id: annId, next: { title: data.title, scope: data.scope ?? 'global' }, ip: clientIp(req) });
    if (published) notifyTargets(db, annId, data.scope ?? 'global', data.target_id ?? null, data.title, data.body);
    return json({ ok: true, id: annId }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin', 'organizer');
    const body = (await readJson(req)) as unknown as { announcement_id: number } & Record<string, unknown>;
    const id = z.number().int().positive().parse(body.announcement_id);
    const db = getDb();
    const a = db.prepare('SELECT * FROM announcements WHERE id = ? AND deleted_at IS NULL').get(id) as unknown as { id: number; title: string; body: string; is_published: number; scope: string; target_id: number | null } | undefined;
    if (!a) throw new ApiError(404, 'Announcement not found');
    if (a.scope !== 'global' && admin.role !== 'super_admin') {
      // organizers may only edit their scoped announcements (course/workshop they manage)
      if (!isOwner(db, admin, a)) throw new ApiError(403, 'You can only edit your own announcements');
    }
    const prev = { title: a.title, is_published: a.is_published };
    const wasPublished = a.is_published === 1;
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [key, schema] of Object.entries(fields)) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(schema.parse(body[key]));
      }
    }
    if (sets.length) db.prepare(`UPDATE announcements SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);
    const nowPublished = (body.is_published as number | undefined) === 1 && !wasPublished;
    if (nowPublished) notifyTargets(db, id, (body.scope as string) ?? a.scope, (body.target_id as number | null | undefined) ?? a.target_id, a.title, a.body);
    audit(admin, 'ADMIN_UPDATED_ANNOUNCEMENT', { entity: 'announcement', entity_id: id, prev, next: body, ip: clientIp(req) });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { announcement_id } = (await readJson(req)) as unknown as { announcement_id: number };
    const id = z.number().int().positive().parse(announcement_id);
    const db = getDb();
    const a = db.prepare('SELECT id, title FROM announcements WHERE id = ? AND deleted_at IS NULL').get(id) as unknown as { id: number; title: string } | undefined;
    if (!a) throw new ApiError(404, 'Announcement not found');
    db.prepare("UPDATE announcements SET deleted_at = datetime('now'), is_published = 0 WHERE id = ?").run(id);
    audit(admin, 'ADMIN_DELETED_ANNOUNCEMENT', { entity: 'announcement', entity_id: id, prev: { title: a.title }, ip: clientIp(req) });
    return json({ ok: true });
  });
}

function isOwner(db: ReturnType<typeof getDb>, user: { id: number }, a: { scope: string; target_id: number | null }): boolean {
  if (a.scope === 'course') {
    const c = db.prepare('SELECT instructor_id, organizer_id FROM courses WHERE id = ?').get(a.target_id) as unknown as { instructor_id: number | null; organizer_id: number | null } | undefined;
    return !!c && (c.instructor_id === user.id || c.organizer_id === user.id);
  }
  if (a.scope === 'workshop') {
    const w = db.prepare('SELECT instructor_id, organizer_id FROM workshops WHERE id = ?').get(a.target_id) as unknown as { instructor_id: number | null; organizer_id: number | null } | undefined;
    return !!w && (w.instructor_id === user.id || w.organizer_id === user.id);
  }
  return false;
}

function notifyTargets(db: ReturnType<typeof getDb>, _id: number, scope: string, targetId: number | null, title: string, body: string) {
  let userIds: number[] = [];
  if (scope === 'global') userIds = (db.prepare("SELECT id FROM users WHERE is_active = 1 AND deleted_at IS NULL").all() as unknown as { id: number }[]).map((u) => u.id);
  else if (scope === 'course' && targetId) userIds = (db.prepare('SELECT user_id FROM enrollments WHERE course_id = ? AND status = ?').all(targetId, 'active') as unknown as { user_id: number }[]).map((u) => u.user_id);
  else if (scope === 'workshop' && targetId) userIds = (db.prepare("SELECT user_id FROM workshop_registrations WHERE workshop_id = ? AND status IN ('CONFIRMED','PAID')").all(targetId) as unknown as { user_id: number }[]).map((u) => u.user_id);
  else if (scope === 'community' && targetId) userIds = (db.prepare('SELECT user_id FROM community_members WHERE community_id = ?').all(targetId) as unknown as { user_id: number }[]).map((u) => u.user_id);
  else if (scope === 'user' && targetId) userIds = [targetId];
  if (userIds.length) notifyMany(db, userIds, 'system', `Announcement: ${title}`, body.slice(0, 200));
}
