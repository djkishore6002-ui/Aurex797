import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route } from '@/lib/api';
import { audit, saveVersion } from '@/lib/audit';
import { indexSource, removeSource, blocksToText } from '@/lib/ai/knowledge';

const courseFields = z.object({
  title: z.string().trim().min(3).max(160),
  subtitle: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(4000).optional().nullable(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.string().max(10).optional(),
  audience: z.string().max(200).optional().nullable(),
  level_tag: z.string().max(80).optional().nullable(),
  price_cents: z.number().int().min(0).max(10_000_000).optional(),
  duration_hours: z.number().min(0).max(500).optional(),
  instructor_id: z.number().int().nullable().optional(),
  organizer_id: z.number().int().nullable().optional(),
  certificate_enabled: z.number().int().min(0).max(1).optional(),
  is_published: z.number().int().min(0).max(1).optional(),
  is_archived: z.number().int().min(0).max(1).optional(),
  sort_order: z.number().int().min(0).optional(),
});

export async function GET() {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const courses = db
      .prepare(
        `SELECT c.*, i.name AS instructor_name, o.name AS organizer_name,
          (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) AS modules,
          (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND l.is_published = 1) AS published_lessons
         FROM courses c
         LEFT JOIN users i ON i.id = c.instructor_id
         LEFT JOIN users o ON o.id = c.organizer_id
         WHERE c.deleted_at IS NULL ORDER BY c.sort_order, c.id`
      )
      .all();
    return json({ courses });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = await readJson(req);
    const data = courseFields.parse(body);
    const db = getDb();
    const slug = uniqueSlug(data.title, (s) => !!db.prepare('SELECT id FROM courses WHERE slug = ?').get(s));
    const res = db
      .prepare(
        `INSERT INTO courses (slug, title, subtitle, description, difficulty, language, audience, instructor_id, organizer_id, duration_hours, price_cents, level_tag, is_published, sort_order, certificate_enabled)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)`
      )
      .run(
        slug, data.title, data.subtitle ?? null, data.description ?? null,
        data.difficulty ?? 'beginner', data.language ?? 'en', data.audience ?? null,
        data.instructor_id ?? null, data.organizer_id ?? null,
        data.duration_hours ?? 0, data.price_cents ?? 0, data.level_tag ?? null,
        data.sort_order ?? 999, data.certificate_enabled ?? 1
      );
    const courseId = Number(res.lastInsertRowid);
    saveVersion('course', courseId, data, admin.id);
    audit(admin, 'ADMIN_CREATED_COURSE', { entity: 'course', entity_id: courseId, next: { title: data.title }, ip: clientIp(req) });
    if (data.is_published === 1) indexSource(db, 'course', courseId, `Course: ${data.title}`, [data.subtitle, data.level_tag, data.description].filter(Boolean).join('\n'));
    return json({ ok: true, id: courseId, slug }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { course_id: number } & Record<string, unknown>;
    const courseId = z.number().int().positive().parse(body.course_id);
    const db = getDb();
    const course = db.prepare('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL').get(courseId) as unknown as {
      id: number;
      slug: string;
      title: string;
      subtitle: string | null;
      description: string | null;
      thumbnail_url: string | null;
      difficulty: string;
      language: string;
      audience: string | null;
      instructor_id: number | null;
      organizer_id: number | null;
      duration_hours: number;
      price_cents: number;
      level_tag: string | null;
      is_published: number;
      is_archived: number;
      sort_order: number;
      certificate_enabled: number;
      deleted_at: string | null;
    } | undefined;
    if (!course) throw new ApiError(404, 'Course not found');

    const prev = { title: course.title, is_published: course.is_published, is_archived: course.is_archived, sort_order: course.sort_order };

    if (body.action === 'duplicate') {
      const res = db
        .prepare(
          `INSERT INTO courses (slug, title, subtitle, description, thumbnail_url, difficulty, language, audience, instructor_id, organizer_id, duration_hours, price_cents, level_tag, is_published, sort_order, certificate_enabled)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`
        )
        .run(
          uniqueSlug(`${course.title} (copy)`, (s) => !!db.prepare('SELECT id FROM courses WHERE slug = ?').get(s)),
          `${course.title} (copy)`, course.subtitle, course.description, course.thumbnail_url,
          course.difficulty, course.language, course.audience, course.instructor_id, course.organizer_id,
          course.duration_hours, course.price_cents, course.level_tag,
          Number(course.sort_order) + 1, course.certificate_enabled
        );
      const newId = Number(res.lastInsertRowid);
      // Copy modules + lessons (content only, no progress)
      const modules = db.prepare('SELECT * FROM course_modules WHERE course_id = ?').all(courseId) as unknown as { id: number; title: string; description: string | null; sort_order: number; is_published: number }[];
      for (const m of modules) {
        const mRes = db.prepare('INSERT INTO course_modules (course_id, title, description, sort_order, is_published) VALUES (?,?,?,?,?)').run(newId, m.title, m.description, m.sort_order, m.is_published);
        const mId = Number(mRes.lastInsertRowid);
        const lessons = db.prepare('SELECT * FROM lessons WHERE module_id = ?').all(m.id) as unknown as {
          title: string;
          summary: string | null;
          content_json: string;
          video_url: string | null;
          video_duration_seconds: number;
          audio_url: string | null;
          pdf_url: string | null;
          transcript_text: string | null;
          chapters_json: string | null;
          sort_order: number;
          required_watch_percent: number;
          xp: number;
        }[];
        for (const l of lessons) {
          db.prepare(
            `INSERT INTO lessons (module_id, slug, title, summary, content_json, video_url, video_duration_seconds, audio_url, pdf_url, transcript_text, chapters_json, is_published, sort_order, required_watch_percent, xp)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,0,?,?,?)`
          ).run(
            mId,
            uniqueSlug(l.title, (s) => !!db.prepare('SELECT id FROM lessons WHERE slug = ?').get(s)),
            l.title, l.summary, l.content_json, l.video_url, l.video_duration_seconds, l.audio_url, l.pdf_url, l.transcript_text, l.chapters_json,
            l.sort_order, l.required_watch_percent, l.xp
          );
        }
      }
      audit(admin, 'ADMIN_DUPLICATED_COURSE', { entity: 'course', entity_id: newId, prev: { from: courseId }, ip: clientIp(req) });
      return json({ ok: true, id: newId });
    }

    if (body.action === 'archive') {
      db.prepare("UPDATE courses SET is_archived = 1, is_published = 0 WHERE id = ?").run(courseId);
      removeSource(db, 'course', courseId);
      audit(admin, 'ADMIN_ARCHIVED_COURSE', { entity: 'course', entity_id: courseId, prev, ip: clientIp(req) });
      return json({ ok: true });
    }

    // Field updates
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [key, schema] of Object.entries(courseFields)) {
      if (body[key] !== undefined) {
        const parsed = schema.parse(body[key]);
        if (key === 'is_published') {
          if (parsed === 0) removeSource(db, 'course', courseId);
          sets.push('is_published = ?');
          params.push(parsed);
        } else {
          sets.push(`${key} = ?`);
          params.push(parsed);
        }
      }
    }
    if (sets.length) {
      db.prepare(`UPDATE courses SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, courseId);
    }
    const updated = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId) as unknown as Record<string, unknown>;
    if (body.is_published === 1) {
      indexSource(db, 'course', courseId, `Course: ${String(updated.title)}`, [String(updated.subtitle ?? ''), String(updated.level_tag ?? ''), String(updated.description ?? '')].filter(Boolean).join('\n'));
    }
    saveVersion('course', courseId, updated, admin.id);
    audit(admin, 'ADMIN_UPDATED_COURSE', { entity: 'course', entity_id: courseId, prev, next: body, ip: clientIp(req) });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { course_id } = (await readJson(req)) as unknown as { course_id: number };
    const courseId = z.number().int().positive().parse(course_id);
    const db = getDb();
    const course = db.prepare('SELECT id, title FROM courses WHERE id = ? AND deleted_at IS NULL').get(courseId) as unknown as { id: number; title: string } | undefined;
    if (!course) throw new ApiError(404, 'Course not found');
    db.prepare("UPDATE courses SET deleted_at = datetime('now'), is_published = 0 WHERE id = ?").run(courseId);
    removeSource(db, 'course', courseId);
    audit(admin, 'ADMIN_DELETED_COURSE', { entity: 'course', entity_id: courseId, prev: { title: course.title }, ip: clientIp(req) });
    return json({ ok: true });
  });
}

function uniqueSlug(base: string, exists: (s: string) => boolean): string {
  const clean = base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'course';
  let slug = clean;
  let i = 2;
  while (exists(slug)) slug = `${clean}-${i++}`;
  return slug;
}
