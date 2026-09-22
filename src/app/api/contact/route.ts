import { z } from 'zod';
import { getDb } from '@/db';
import { json, rateLimit, clientIp, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const rl = rateLimit(`contact:${clientIp(req)}`, 5, 60_000);
    if (!rl.ok) throw new Error('Too many messages — try again later.');
    const body = (await readJson(req)) as unknown as { name?: unknown; message?: unknown };
    const name = z.string().trim().min(2).max(80).parse(body.name);
    const message = z.string().trim().min(10).max(5000).parse(body.message);
    // Stored in audit-free way: logged server-side only (no email provider in dev build)
    console.log('[contact]', name, message.slice(0, 200));
    return json({ ok: true });
  });
}
