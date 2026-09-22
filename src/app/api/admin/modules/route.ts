import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { course_id: number; title: string; description?: string };
    const courseId = z.number().int().positive().parse(body.course_id);
    const title = z.string().trim().min(2).max(160).parse(body.title);
    const db = getDb();
    if (!db.prepare('SELECT id FROM courses WHERE id = ? AND deleted_at IS NULL').get(courseId)) throw new ApiError(404, 'Course not found');
    const nextOrder = (db.prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 AS n FROM course_modules WHERE course_id = ?').get(courseId) as unknown as { n: number }).n;
    const res = db.prepare('INSERT INTO course_modules (course_id, title, description, sort_order) VALUES (?,?,?,?)').run(courseId, title, body.description ?? null, nextOrder);
    audit(admin, 'ADMIN_CREATED_MODULE', { entity: 'module', entity_id: Number(res.lastInsertRowid), next: { title, course_id: courseId } });
    return json({ ok: true, id: Number(res.lastInsertRowid) }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { module_id: number; title?: string; description?: string | null; is_published?: number; sort_order?: number };
    const id = z.number().int().positive().parse(body.module_id);
    const db = getDb();
    const mod = db.prepare('SELECT * FROM course_modules WHERE id = ?').get(id) as unknown as { id: number; title: string; description: string | null } | undefined;
    if (!mod) throw new ApiError(404, 'Module not found');
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (body.title !== undefined) { sets.push('title = ?'); params.push(z.string().trim().min(2).max(160).parse(body.title)); }
    if (body.description !== undefined) { sets.push('description = ?'); params.push(body.description); }
    if (body.is_published !== undefined) { sets.push('is_published = ?'); params.push(body.is_published ? 1 : 0); }
    if (body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(z.number().int().min(0).parse(body.sort_order)); }
    if (sets.length) db.prepare(`UPDATE course_modules SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
    audit(admin, 'ADMIN_UPDATED_MODULE', { entity: 'module', entity_id: id, prev: { title: mod.title }, next: body });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { module_id } = (await readJson(req)) as unknown as { module_id: number };
    const id = z.number().int().positive().parse(module_id);
    const db = getDb();
    const mod = db.prepare('SELECT id, title, course_id FROM course_modules WHERE id = ?').get(id) as unknown as { id: number; title: string; course_id: number } | undefined;
    if (!mod) throw new ApiError(404, 'Module not found');
    const lessonCount = (db.prepare('SELECT COUNT(*) c FROM lessons WHERE module_id = ?').get(id) as unknown as { c: number }).c;
    db.prepare('DELETE FROM course_modules WHERE id = ?').run(id); // cascades lessons
    audit(admin, 'ADMIN_DELETED_MODULE', { entity: 'module', entity_id: id, prev: { title: mod.title, lessons: lessonCount, course_id: mod.course_id } });
    return json({ ok: true });
  });
}
