import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole, hashPassword } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';

export async function GET() {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const organizers = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.is_active, u.created_at,
        op.title, op.bio, op.permissions
        FROM users u LEFT JOIN organizer_profiles op ON op.user_id = u.id
        WHERE u.role = 'organizer' AND u.deleted_at IS NULL ORDER BY u.id`
      )
      .all();
    return json({ organizers });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { email: string; name: string; password: string; title?: string; permissions?: string[] };
    const email = z.string().trim().toLowerCase().email().parse(body.email);
    const name = z.string().trim().min(2).max(80).parse(body.name);
    const password = z.string().min(8).max(128).parse(body.password);
    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) throw new ApiError(409, 'A user with this email already exists');
    const res = db.prepare("INSERT INTO users (email, password_hash, role, name, is_active, email_verified) VALUES (?,?, 'organizer', ?, 1, 1)").run(email, hashPassword(password), name);
    const userId = Number(res.lastInsertRowid);
    db.prepare('INSERT INTO organizer_profiles (user_id, title, permissions) VALUES (?,?,?)').run(userId, body.title ?? 'Organizer', JSON.stringify(body.permissions ?? ['courses', 'workshops', 'attendance', 'announcements']));
    audit(admin, 'ADMIN_CREATED_ORGANIZER', { entity: 'user', entity_id: userId, next: { email, name, title: body.title }, ip: clientIp(req) });
    return json({ ok: true, id: userId }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { organizer_id: number; name?: string; title?: string; is_active?: number; permissions?: string[] };
    const id = z.number().int().positive().parse(body.organizer_id);
    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'organizer'").get(id) as unknown as { id: number; name: string } | undefined;
    if (!user) throw new ApiError(404, 'Organizer not found');
    if (body.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(z.string().trim().min(2).max(80).parse(body.name), id);
    if (body.is_active !== undefined) db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(body.is_active ? 1 : 0, id);
    if (body.title !== undefined || body.permissions !== undefined) {
      db.prepare(
        `INSERT INTO organizer_profiles (user_id, title, permissions) VALUES (?,?,?)
         ON CONFLICT(user_id) DO UPDATE SET title = COALESCE(excluded.title, organizer_profiles.title), permissions = COALESCE(excluded.permissions, organizer_profiles.permissions), updated_at = datetime('now')`
      ).run(id, body.title ?? null, body.permissions ? JSON.stringify(body.permissions) : null);
    }
    audit(admin, 'ADMIN_UPDATED_ORGANIZER', { entity: 'user', entity_id: id, next: body, ip: clientIp(req) });
    return json({ ok: true });
  });
}
