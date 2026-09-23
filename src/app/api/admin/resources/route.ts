import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, clientIp, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { indexSource, removeSource } from '@/lib/ai/knowledge';

const fields = z.object({
  title: z.string().trim().min(3).max(200),
  title_tamil: z.string().trim().max(200).nullable().optional(),
  type: z.enum(['video', 'note', 'book', 'guide', 'article', 'playlist', 'course']),
  provider: z.enum(['npel', 'youtube', 'alison', 'pdf', 'website', 'other']),
  url: z.string().trim().url(),
  youtube_id: z.string().trim().max(20).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  description_tamil: z.string().trim().max(2000).nullable().optional(),
  language: z.enum(['ta', 'en', 'multi']).default('ta'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional(),
  course_id: z.number().int().positive().nullable().optional(),
  lesson_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).optional(),
  is_published: z.number().int().min(0).max(1).optional(),
});

function reindex(db: ReturnType<typeof getDb>, r: Record<string, unknown>) {
  indexSource(
    db,
    'resource',
    Number(r.id),
    `Learning resource: ${r.title}`,
    `${r.type} · ${r.provider} · ${r.language}${r.level ? ` · ${r.level}` : ''}\n${r.description ?? ''}\nURL: ${r.url}`
  );
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const data = fields.parse(await readJson(req));
    const db = getDb();
    const res = db
      .prepare(
        `INSERT INTO learning_resources (course_id, lesson_id, title, title_tamil, type, provider, url, youtube_id, description, description_tamil, language, level, sort_order, is_published)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      )
      .run(
        data.course_id ?? null,
        data.lesson_id ?? null,
        data.title,
        data.title_tamil ?? null,
        data.type,
        data.provider,
        data.url,
        data.youtube_id ?? null,
        data.description ?? null,
        data.description_tamil ?? null,
        data.language,
        data.level ?? null,
        data.sort_order ?? 0,
        data.is_published ?? 1
      );
    const id = Number(res.lastInsertRowid);
    const row = db.prepare('SELECT * FROM learning_resources WHERE id = ?').get(id) as unknown as Record<string, unknown>;
    reindex(db, row);
    audit(admin, 'ADMIN_CREATED_RESOURCE', { entity: 'resource', entity_id: id, next: { title: data.title, provider: data.provider }, ip: clientIp(req) });
    return json({ ok: true, id }, 201);
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { resource_id: number } & Record<string, unknown>;
    const id = z.number().int().positive().parse(body.resource_id);
    const db = getDb();
    const r = db.prepare('SELECT * FROM learning_resources WHERE id = ?').get(id) as unknown as Record<string, unknown> | undefined;
    if (!r) throw new ApiError(404, 'Resource not found');
    const parsed = fields.partial().parse(
      Object.fromEntries(Object.entries(body).filter(([k]) => k !== 'resource_id'))
    );
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    for (const [k, v] of Object.entries(parsed)) {
      sets.push(`${k} = ?`);
      params.push(v as string | number | null);
    }
    if (sets.length) {
      db.prepare(`UPDATE learning_resources SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
      const updated = db.prepare('SELECT * FROM learning_resources WHERE id = ?').get(id) as unknown as Record<string, unknown>;
      reindex(db, updated);
    }
    audit(admin, 'ADMIN_UPDATED_RESOURCE', { entity: 'resource', entity_id: id, prev: { title: r.title }, next: parsed, ip: clientIp(req) });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const { resource_id } = (await readJson(req)) as unknown as { resource_id: number };
    const id = z.number().int().positive().parse(resource_id);
    const db = getDb();
    const r = db.prepare('SELECT id, title FROM learning_resources WHERE id = ?').get(id) as unknown as { id: number; title: string } | undefined;
    if (!r) throw new ApiError(404, 'Resource not found');
    db.prepare('DELETE FROM learning_resources WHERE id = ?').run(id);
    removeSource(db, 'resource', id);
    audit(admin, 'ADMIN_DELETED_RESOURCE', { entity: 'resource', entity_id: id, prev: { title: r.title }, ip: clientIp(req) });
    return json({ ok: true });
  });
}
