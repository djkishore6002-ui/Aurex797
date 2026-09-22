import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, readJson, route } from '@/lib/api';

/** Helpful / not-helpful feedback on AI answers (stored for quality review). */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = (await readJson(req)) as unknown as { rating: 'up' | 'down'; answer: string };
    z.enum(['up', 'down']).parse(body.rating);
    const db = getDb();
    db.prepare(
      `INSERT INTO ai_usage (user_id, provider, model, purpose, tokens_in, tokens_out)
       VALUES (?, 'feedback', ?, ?, 0, 0)`
    ).run(user.id, body.rating, (body.answer ?? '').slice(0, 300));
    return json({ ok: true });
  });
}
