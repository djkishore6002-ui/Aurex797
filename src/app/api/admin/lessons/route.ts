import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit, saveVersion } from '@/lib/audit';
import { indexSource, blocksToText, safeJsonText } from '@/lib/ai/knowledge';

const blockSchema = z.object({ type: z.string().max(40), data: z.record(z.any()).default({}) });

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { module_id: number; title: string; summary?: string; blocks?: unknown[]; video_url?: string | null; video_duration_seconds?: number; audio_url?: string | null; transcript_text?: string | null; chapters?: { title: string; seconds: number }[] | null };
    const moduleId = z.number().int().positive().parse(body.module_id);
    const title = z.string().trim().min(2).max(200).parse(body.title);
    const blocks = (body.blocks ?? []).map((b) => blockSchema.parse(b));
    const db = getDb();
    const mod = db.prepare('SELECT m.*, c.title AS course_title FROM course_modules m JOIN courses c ON c.id = m.course_id WHERE m.id = ?').get(moduleId) as unknown as { id: number; title: string; course_id: number; course_title: string } | undefined;
    if (!mod) throw new ApiError(404, 'Module not found');
    const nextOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM lessons WHERE module_id = ?').get(moduleId) as unknown as { n: number }).n;
    const slug = uniqueSlug(title, (s) => !!db.prepare('SELECT id FROM lessons WHERE slug = ?').get(s));
    const res = db
      .prepare(
        `INSERT INTO lessons (module_id, slug, title, summary, content_json, video_url, video_duration_seconds, audio_url, transcript_text, chapters_json, is_published, sort_order)
         VALUES (?,?,?,?,?,?,?,?,?,0,?)`
      )
      .run(moduleId, slug, title, body.summary ?? null, JSON.stringify(blocks), body.video_url ?? null, body.video_duration_seconds ?? 0, body.audio_url ?? null, body.transcript_text ?? null, body.chapters ? JSON.stringify(body.chapters) : null, nextOrder);
    const lessonId = Number(res.lastInsertRowid);
    saveVersion('lesson', lessonId, { title, blocks }, admin.id);
    audit(admin, 'ADMIN_CREATED_LESSON', { entity: 'lesson', entity_id: lessonId, next: { title, module_id: moduleId } });
    if (body.video_url) indexLesson(db, lessonId, mod.course_title, mod.title ?? '', title, blocks, body.summary ?? null, body.transcript_text ?? null);
    return json({ ok: true, id: lessonId, slug }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as {
      lesson_id: number;
      title?: string;
      summary?: string | null;
      blocks?: unknown[];
      video_url?: string | null;
      video_duration_seconds?: number;
      audio_url?: string | null;
      pdf_url?: string | null;
      transcript_text?: string | null;
      chapters?: unknown;
      sort_order?: number;
      is_published?: number;
    };
    const lessonId = z.number().int().positive().parse(body.lesson_id);
    const db = getDb();
    const lesson = db.prepare('SELECT l.*, m.title AS module_title, c.title AS course_title FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.id = ?').get(lessonId) as unknown as Record<string, unknown> & { id: number } | undefined;
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    const prev = { title: lesson.title, is_published: lesson.is_published };

    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (body.title !== undefined) { sets.push('title = ?'); params.push(z.string().trim().min(2).max(200).parse(body.title)); }
    if (body.summary !== undefined) { sets.push('summary = ?'); params.push(body.summary); }
    if (body.blocks !== undefined) { sets.push('content_json = ?'); params.push(JSON.stringify((body.blocks as unknown[]).map((b) => blockSchema.parse(b)))); }
    if (body.video_url !== undefined) { sets.push('video_url = ?'); params.push(body.video_url); }
    if (body.video_duration_seconds !== undefined) { sets.push('video_duration_seconds = ?'); params.push(z.number().min(0).max(86400).parse(body.video_duration_seconds)); }
    if (body.audio_url !== undefined) { sets.push('audio_url = ?'); params.push(body.audio_url); }
    if (body.pdf_url !== undefined) { sets.push('pdf_url = ?'); params.push(body.pdf_url); }
    if (body.transcript_text !== undefined) { sets.push('transcript_text = ?'); params.push(body.transcript_text); }
    if (body.chapters !== undefined) { sets.push('chapters_json = ?'); params.push(body.chapters ? JSON.stringify(body.chapters) : null); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(z.number().int().min(0).parse(body.sort_order)); }
    if (body.is_published !== undefined) { sets.push('is_published = ?'); params.push(body.is_published ? 1 : 0); }
    if (sets.length) db.prepare(`UPDATE lessons SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, lessonId);

    const updated = db.prepare('SELECT l.*, m.title AS module_title, c.title AS course_title FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.id = ?').get(lessonId) as unknown as { id: number; title: string; is_published: number; course_title: string; module_title: string; summary: string | null; content_json: string; transcript_text: string | null };
    // AI knowledge sync: published → index (replaces stale); unpublished → mark stale/removed
    if (updated.is_published === 1) {
      indexLesson(db, lessonId, updated.course_title, updated.module_title, updated.title, safeJsonText(updated.content_json) as unknown as unknown[], updated.summary, updated.transcript_text);
    } else {
      indexSource(db, 'lesson', lessonId, `Lesson: ${updated.title} (unpublished)`, 'This lesson is unpublished and excluded from learner search.');
    }
    saveVersion('lesson', lessonId, { title: updated.title, is_published: updated.is_published }, admin.id);
    audit(admin, 'ADMIN_UPDATED_LESSON', { entity: 'lesson', entity_id: lessonId, prev, next: { ...body, is_published: updated.is_published } });
    return json({ ok: true, published: updated.is_published === 1 });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { lesson_id } = (await readJson(req)) as unknown as { lesson_id: number };
    const id = z.number().int().positive().parse(lesson_id);
    const db = getDb();
    const lesson = db.prepare('SELECT id, title, slug FROM lessons WHERE id = ?').get(id) as unknown as { id: number; title: string } | undefined;
    if (!lesson) throw new ApiError(404, 'Lesson not found');
    db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
    audit(admin, 'ADMIN_DELETED_LESSON', { entity: 'lesson', entity_id: id, prev: { title: lesson.title } });
    return json({ ok: true });
  });
}

function indexLesson(db: ReturnType<typeof getDb>, lessonId: number, courseTitle: string, moduleTitle: string, title: string, blocks: unknown, summary: string | null, transcript: string | null) {
  const text = [summary ?? '', blocksToText(blocks), transcript ?? ''].filter(Boolean).join('\n');
  indexSource(db, 'lesson', lessonId, `Lesson: ${title} (${courseTitle} → ${moduleTitle})`, text);
}

function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'lesson';
  let slug = clean;
  let i = 2;
  while (exists(slug)) slug = `${clean}-${i++}`;
  return slug;
}
