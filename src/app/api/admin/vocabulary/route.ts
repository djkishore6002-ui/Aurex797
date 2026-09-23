import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { indexSource } from '@/lib/ai/knowledge';

const wordFields = z.object({
  tamil: z.string().trim().min(1).max(80),
  transliteration: z.string().trim().min(1).max(120),
  meaning: z.string().trim().min(1).max(200),
  meaning_language: z.string().max(10).optional(),
  part_of_speech: z.string().max(60).optional().nullable(),
  example_tamil: z.string().max(200).optional().nullable(),
  example_meaning: z.string().max(200).optional().nullable(),
  level: z.string().max(20).optional(),
  course_id: z.number().int().nullable().optional(),
  lesson_id: z.number().int().nullable().optional(),
  is_published: z.number().int().min(0).max(1).optional(),
});

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const data = wordFields.parse(await readJson(req));
    const db = getDb();
    const res = db
      .prepare(
        `INSERT INTO vocabulary (lesson_id, course_id, tamil, transliteration, meaning, meaning_language, part_of_speech, example_tamil, example_meaning, level, is_published)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(data.lesson_id ?? null, data.course_id ?? null, data.tamil, data.transliteration, data.meaning, data.meaning_language ?? 'en', data.part_of_speech ?? null, data.example_tamil ?? null, data.example_meaning ?? null, data.level ?? 'beginner', data.is_published === 0 ? 0 : 1);
    const wordId = Number(res.lastInsertRowid);
    audit(admin, 'ADMIN_CREATED_VOCABULARY', { entity: 'vocabulary', entity_id: wordId, next: data });
    reindexCourseVocab(db, data.course_id ?? null, data.lesson_id ?? null);
    return json({ ok: true, id: wordId }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { vocabulary_id: number } & Record<string, unknown>;
    const id = z.number().int().positive().parse(body.vocabulary_id);
    const db = getDb();
    const word = db.prepare('SELECT * FROM vocabulary WHERE id = ?').get(id) as unknown as Record<string, unknown> & { id: number; course_id: number | null } | undefined;
    if (!word) throw new ApiError(404, 'Word not found');
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [key, schema] of Object.entries(wordFields)) {
      if (body[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(schema.parse(body[key]));
      }
    }
    if (sets.length) db.prepare(`UPDATE vocabulary SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
    audit(admin, 'ADMIN_UPDATED_VOCABULARY', { entity: 'vocabulary', entity_id: id, prev: { tamil: word.tamil }, next: body });
    reindexCourseVocab(db, word.course_id, null);
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { vocabulary_id } = (await readJson(req)) as unknown as { vocabulary_id: number };
    const id = z.number().int().positive().parse(vocabulary_id);
    const db = getDb();
    const word = db.prepare('SELECT id, tamil, course_id FROM vocabulary WHERE id = ?').get(id) as unknown as { id: number; tamil: string; course_id: number | null } | undefined;
    if (!word) throw new ApiError(404, 'Word not found');
    db.prepare('DELETE FROM vocabulary WHERE id = ?').run(id);
    audit(admin, 'ADMIN_DELETED_VOCABULARY', { entity: 'vocabulary', entity_id: id, prev: { tamil: word.tamil } });
    reindexCourseVocab(db, word.course_id, null);
    return json({ ok: true });
  });
}

function reindexCourseVocab(db: ReturnType<typeof getDb>, courseId: number | null, _lessonId: number | null) {
  if (!courseId) return;
  const c = db.prepare('SELECT title FROM courses WHERE id = ?').get(courseId) as unknown as { title: string } | undefined;
  if (!c) return;
  const words = db.prepare('SELECT tamil, transliteration, meaning, example_tamil, example_meaning FROM vocabulary WHERE course_id = ? AND is_published = 1').all(courseId) as unknown as { tamil: string; transliteration: string; meaning: string; example_tamil: string | null; example_meaning: string | null }[];
  indexSource(db, 'vocabulary', courseId, `Vocabulary of course: ${c.title}`, words.map((w) => `${w.tamil} (${w.transliteration}) = ${w.meaning}${w.example_tamil ? `. Example: ${w.example_tamil} (${w.example_meaning ?? ''})` : ''}`).join('\n'));
}
