import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, readJson, route } from '@/lib/api';

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  native_language: z.string().max(10),
  tamil_level: z.enum(['beginner', 'intermediate', 'advanced', 'native']),
  learning_goal: z.string().max(200).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  privacy_public: z.boolean(),
});

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = schema.parse(await readJson(req));
    const db = getDb();
    db.prepare('UPDATE users SET name = ?, native_language = ?, tamil_level = ?, learning_goal = ?, bio = ?, privacy_public = ?, updated_at = datetime(\'now\') WHERE id = ?').run(
      body.name,
      body.native_language,
      body.tamil_level,
      body.learning_goal ?? null,
      body.bio ?? null,
      body.privacy_public ? 1 : 0,
      user.id
    );
    return json({ ok: true });
  });
}
