import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole, hashPassword } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route, rateLimit } from '@/lib/api';
import { audit, saveVersion } from '@/lib/audit';

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    const users = db
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.is_active, u.native_language, u.tamil_level, u.created_at, u.last_login_at, u.deleted_at,
          (SELECT COUNT(*) FROM enrollments e WHERE e.user_id = u.id) AS enrollments,
          (SELECT COUNT(*) FROM certificates c WHERE c.user_id = u.id AND c.revoked_at IS NULL) AS certificates,
          (SELECT COUNT(*) FROM attendance a WHERE a.user_id = u.id) AS attendance_rows
         FROM users u
         WHERE (? = '' OR u.email LIKE ? OR u.name LIKE ?)
         ORDER BY u.created_at DESC LIMIT 200`
      )
      .all(q, `%${q}%`, `%${q}%`);
    return json({ users });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const rl = rateLimit(`admin:user:${clientIp(req)}`, 10, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many changes');
    const body = (await readJson(req)) as unknown as { email: string; name: string; password: string; role?: string; native_language?: string };
    const email = z.string().trim().toLowerCase().email().parse(body.email);
    const name = z.string().trim().min(2).max(80).parse(body.name);
    const password = z.string().min(8).max(128).parse(body.password);
    const role = z.enum(['super_admin', 'organizer', 'teacher', 'learner']).parse(body.role ?? 'learner');
    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) throw new ApiError(409, 'A user with this email already exists');
    const res = db
      .prepare('INSERT INTO users (email, password_hash, role, name, native_language, is_active, email_verified) VALUES (?,?,?,?,?,1,1)')
      .run(email, hashPassword(password), role, name, body.native_language ?? 'en');
    const userId = Number(res.lastInsertRowid);
    audit(admin, 'ADMIN_CREATED_USER', { entity: 'user', entity_id: userId, next: { email, role, name }, ip: clientIp(req) });
    return json({ ok: true, id: userId }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { user_id: number; name?: string; role?: string; is_active?: number; password?: string };
    const userId = z.number().int().positive().parse(body.user_id);
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as { id: number; name: string; role: string; is_active: number } | undefined;
    if (!user) throw new ApiError(404, 'User not found');
    const prev = { name: user.name, role: user.role, is_active: user.is_active };

    if (body.role !== undefined) {
      if (!['super_admin', 'organizer', 'teacher', 'learner'].includes(body.role)) throw new ApiError(400, 'Invalid role');
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(body.role, userId);
    }
    if (body.is_active !== undefined) {
      const active = body.is_active ? 1 : 0;
      if (active === 0 && user.id === admin.id) throw new ApiError(400, 'You cannot deactivate your own account');
      db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(active, userId);
    }
    if (body.name) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(z.string().trim().min(2).max(80).parse(body.name), userId);
    if (body.password) db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(z.string().min(8).max(128).parse(body.password)), userId);

    saveVersion('user', userId, { ...prev, ...body }, admin.id);
    audit(admin, 'ADMIN_UPDATED_USER', { entity: 'user', entity_id: userId, prev, next: body, ip: clientIp(req) });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { user_id } = (await readJson(req)) as unknown as { user_id: number };
    const userId = z.number().int().positive().parse(user_id);
    const db = getDb();
    if (userId === admin.id) throw new ApiError(400, 'You cannot delete your own account');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as unknown as { id: number; email: string; role: string } | undefined;
    if (!user) throw new ApiError(404, 'User not found');
    // Soft delete: keep audit trail and FK-referenced records; deactivate the account
    db.prepare("UPDATE users SET deleted_at = datetime('now'), is_active = 0 WHERE id = ?").run(userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    audit(admin, 'ADMIN_DELETED_USER', { entity: 'user', entity_id: userId, prev: { email: user.email, role: user.role }, ip: clientIp(req) });
    return json({ ok: true });
  });
}
