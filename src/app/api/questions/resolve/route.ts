import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const { question_id } = (await readJson(req)) as unknown as { question_id: number };
    z.number().int().positive().parse(question_id);
    const db = getDb();
    const q = db.prepare('SELECT id, status FROM learner_questions WHERE id = ? AND user_id = ?').get(question_id, user.id) as unknown as { status: string } | undefined;
    if (!q) throw new ApiError(404, 'Question not found');
    if (q.status === 'resolved') return json({ ok: true, already: true });
    db.prepare("UPDATE learner_questions SET status = 'resolved', updated_at = datetime('now') WHERE id = ?").run(question_id);
    return json({ ok: true });
  });
}
