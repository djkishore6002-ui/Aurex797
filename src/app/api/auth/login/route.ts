import { getDb } from '@/db';
import { verifyPassword, createSession } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { ApiError, clientIp, json, rateLimit, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const { email, password } = loginSchema.parse(await readJson(req));
    const ip = clientIp(req);
    const rl = rateLimit(`login:${ip}`, 10, 15 * 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many login attempts — wait a few minutes.');

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as unknown as { id: number; password_hash: string; is_active: number; name: string } | undefined;
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw new ApiError(401, 'Invalid email or password.');
    }
    if (!user.is_active) throw new ApiError(403, 'This account has been deactivated. Contact support.');
    createSession(user.id, ip, req.headers.get('user-agent') ?? undefined);
    return json({ ok: true, redirect: '/dashboard' });
  });
}
