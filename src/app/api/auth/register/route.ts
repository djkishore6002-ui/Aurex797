import { getDb } from '@/db';
import { hashPassword, createSession } from '@/lib/auth';
import { registerSchema } from '@/lib/validation';
import { ApiError, clientIp, json, rateLimit, readJson, route } from '@/lib/api';
import { notify } from '@/lib/notifications';

export async function POST(req: Request) {
  return route(async () => {
    const body = registerSchema.parse(await readJson(req));
    const ip = clientIp(req);
    const rl = rateLimit(`register:${ip}`, 5, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many attempts — try again shortly.');

    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
    if (existing) throw new ApiError(409, 'An account with this email already exists. Try logging in.');

    const res = db
      .prepare(
        `INSERT INTO users (email, password_hash, role, name, native_language, learning_goal, is_active, email_verified)
         VALUES (?,?,?,?,?,?,1,0)`
      )
      .run(body.email, hashPassword(body.password), 'learner', body.name, body.native_language ?? 'en', body.learning_goal ?? null);
    const userId = Number(res.lastInsertRowid);
    createSession(userId, ip, req.headers.get('user-agent') ?? undefined);
    notify(db, userId, 'system', 'Welcome to Solai! 🌱', 'Start with Level 1 · Lesson 1 to meet the Tamil alphabet.', '/learn/tamil-for-beginners');
    return json({ ok: true, redirect: '/dashboard' }, 201);
  });
}
