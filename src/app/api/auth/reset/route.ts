import { getDb } from '@/db';
import { hashPassword } from '@/lib/auth';
import { ApiError, json, rateLimit, readJson, route, clientIp } from '@/lib/api';
import { hashToken } from '@/lib/crypto';
import { z } from 'zod';
import { passwordSchema } from '@/lib/validation';

export async function POST(req: Request) {
  return route(async () => {
    const { token, code, password } = (await readJson(req)) as unknown as { token: string; code: string; password: string };
    passwordSchema.parse(password);
    if (!/^\d{6}$/.test(code ?? '')) throw new ApiError(400, 'Enter the 6-digit code.');
    const rl = rateLimit(`reset:${clientIp(req)}`, 5, 15 * 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many attempts — wait a few minutes.');

    const db = getDb();
    // Match either the full dev token or the 6-digit code derived from it
    const candidates = [token, code];
    const rows = db.prepare('SELECT * FROM password_resets WHERE user_id IN (SELECT id FROM users) ORDER BY id DESC LIMIT 50').all() as unknown as { id: number; user_id: number; token_hash: string; expires_at: string; used_at: string | null }[];
    let match: (typeof rows)[number] | null = null;
    for (const row of rows) {
      if (row.used_at) continue;
      if (new Date(row.expires_at.replace(' ', 'T') + (row.expires_at.includes('T') ? '' : 'Z')).getTime() < Date.now()) continue;
      if (candidates.some((c) => c && hashToken(c) === row.token_hash)) {
        match = row;
        break;
      }
    }
    if (!match) throw new ApiError(400, 'Invalid or expired reset code.');

    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), match.user_id);
    db.prepare('UPDATE password_resets SET used_at = datetime(\'now\') WHERE id = ?').run(match.id);
    return json({ ok: true });
  });
}
