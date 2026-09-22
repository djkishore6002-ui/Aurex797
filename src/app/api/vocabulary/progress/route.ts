import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, readJson, route } from '@/lib/api';
import { awardXp } from '@/lib/gamify';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { vocabulary_id, status } = (await readJson(req)) as unknown as { vocabulary_id: number; status: 'known' | 'learning' };
    z.number().int().positive().parse(vocabulary_id);
    if (!['known', 'learning'].includes(status)) throw new Error('Invalid status');
    const db = getDb();

    const word = db.prepare('SELECT id FROM vocabulary WHERE id = ?').get(vocabulary_id);
    if (!word) throw new Error('Word not found');

    const prev = db.prepare('SELECT status FROM vocabulary_progress WHERE user_id = ? AND vocabulary_id = ?').get(user.id, vocabulary_id) as unknown as { status: string } | undefined;
    db.prepare(
      `INSERT INTO vocabulary_progress (user_id, vocabulary_id, status, last_reviewed_at) VALUES (?,?,?, datetime('now'))
       ON CONFLICT(user_id, vocabulary_id) DO UPDATE SET status = excluded.status, review_count = review_count + 1, last_reviewed_at = datetime('now')`
    ).run(user.id, vocabulary_id, status);

    if (status === 'known' && prev?.status !== 'known') {
      awardXp(db, user.id, 'vocab_learned', 5, 'vocabulary', vocabulary_id);
    }
    return json({ ok: true });
  });
}
