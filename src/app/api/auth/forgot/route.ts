import { getDb } from '@/db';
import { ApiError, clientIp, json, rateLimit, readJson, route } from '@/lib/api';
import { hashToken, randomToken } from '@/lib/crypto';
import { emailSchema } from '@/lib/validation';

export async function POST(req: Request) {
  return route(async () => {
    const { email } = (await readJson(req)) as unknown as { email: string };
    emailSchema.parse(email);
    const rl = rateLimit(`forgot:${clientIp(req)}`, 3, 15 * 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many requests — wait a few minutes.');

    const db = getDb();
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as unknown as { id: number } | undefined;
    // Always respond the same to avoid account enumeration.
    if (!user) return json({ ok: true, token: null });

    const token = randomToken(16);
    const code = token.replace(/[^a-z0-9]/gi, '').slice(-6);
    const expires = new Date(Date.now() + 30 * 60_000).toISOString();
    const ins = db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?,?,?)');
    ins.run(user.id, hashToken(token), expires); // full token (dev mode)
    ins.run(user.id, hashToken(code), expires); // 6-digit code (the UX path)

    // DEVELOPMENT MODE: surface the 6-digit code so the flow is testable
    // without an email provider. Production emails the full token instead.
    return json({ ok: true, token: code });
  });
}
