import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { name: string; description?: string; is_private?: number };
    const name = z.string().trim().min(3).max(120).parse(body.name);
    const db = getDb();
    const slug = uniqueSlug(name, (s) => !!db.prepare('SELECT id FROM communities WHERE slug = ?').get(s));
    const res = db.prepare('INSERT INTO communities (slug, name, description, is_private, created_by) VALUES (?,?,?,?,?)').run(slug, name, body.description ?? null, body.is_private ? 1 : 0, admin.id);
    audit(admin, 'ADMIN_CREATED_COMMUNITY', { entity: 'community', entity_id: Number(res.lastInsertRowid), next: { name } });
    return json({ ok: true, id: Number(res.lastInsertRowid) }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { community_id: number; action: 'delete' | 'toggle'; name?: string; description?: string | null };
    const id = z.number().int().positive().parse(body.community_id);
    const db = getDb();
    const c = db.prepare('SELECT * FROM communities WHERE id = ?').get(id) as unknown as { id: number; name: string; deleted_at: string | null } | undefined;
    if (!c) throw new ApiError(404, 'Community not found');
    if (body.action === 'delete') {
      db.prepare("UPDATE communities SET deleted_at = datetime('now') WHERE id = ?").run(id);
      audit(admin, 'ADMIN_DELETED_COMMUNITY', { entity: 'community', entity_id: id, prev: { name: c.name } });
    } else {
      if (body.name) db.prepare('UPDATE communities SET name = ? WHERE id = ?').run(z.string().trim().min(3).max(120).parse(body.name), id);
      if (body.description !== undefined) db.prepare('UPDATE communities SET description = ? WHERE id = ?').run(body.description, id);
      audit(admin, 'ADMIN_UPDATED_COMMUNITY', { entity: 'community', entity_id: id, next: body });
    }
    return json({ ok: true });
  });
}

/** Post moderation: hide / unhide / delete posts & comments */
export async function PATCH(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin', 'organizer', 'teacher');
    const body = (await readJson(req)) as unknown as { target_type: 'post' | 'comment'; target_id: number; action: 'hide' | 'unhide' | 'delete'; reason?: string };
    const id = z.number().int().positive().parse(body.target_id);
    const db = getDb();
    const table = body.target_type === 'post' ? 'posts' : 'comments';
    const row = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(id) as unknown as { id: number } | undefined;
    if (!row) throw new ApiError(404, 'Content not found');
    if (body.action === 'delete') {
      db.prepare(`UPDATE ${table} SET deleted_at = datetime('now') WHERE id = ?`).run(id);
    } else if (body.action === 'hide') {
      db.prepare(`UPDATE ${table} SET is_hidden = 1, hidden_reason = ? WHERE id = ?`).run(body.reason ?? 'flagged by moderator', id);
    } else {
      db.prepare(`UPDATE ${table} SET is_hidden = 0, hidden_reason = NULL WHERE id = ?`).run(id);
    }
    audit(admin, `ADMIN_MODERATED_${body.target_type.toUpperCase()}`, { entity: table, entity_id: id, next: { action: body.action, reason: body.reason } });
    return json({ ok: true });
  });
}

/** Suspend / reinstate a user (community safety) */
export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { user_id, reinstate } = (await readJson(req)) as unknown as { user_id: number; reinstate?: boolean };
    const id = z.number().int().positive().parse(user_id);
    const db = getDb();
    if (id === admin.id) throw new ApiError(400, 'You cannot modify your own account');
    const active = reinstate ? 1 : 0;
    db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active, id);
    audit(admin, reinstate ? 'ADMIN_REINSTATED_USER' : 'ADMIN_SUSPENDED_USER', { entity: 'user', entity_id: id, next: { is_active: active } });
    return json({ ok: true });
  });
}

function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'community';
  let slug = clean;
  let i = 2;
  while (exists(slug)) slug = `${clean}-${i++}`;
  return slug;
}
