import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, rateLimit, clientIp, route } from '@/lib/api';
import { preliminaryAnswer } from '@/lib/ai/gateway';
import { notify } from '@/lib/notifications';

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`question:${user.id}`, 10, 60_000);
    if (!rl.ok) throw new ApiError(429, 'Too many questions — give teachers a little time.');

    const form = await req.formData().catch(() => null);
    if (!form) throw new ApiError(400, 'Invalid form');
    const title = z.string().trim().min(5, 'Question is too short').max(200).parse(String(form.get('title') ?? ''));
    const body = z.string().trim().min(10, 'Add a bit more detail').max(4000).parse(String(form.get('body') ?? ''));

    const db = getDb();
    const attachmentUrl = form.get('attachment') ? '/uploads/pending' : null; // placeholder; upload handled by /api/upload
    let attachmentPath: string | null = null;

    // Attachment (image/audio) — validated & stored on disk
    const file = form.get('attachment');
    if (file && typeof File !== 'undefined' && file instanceof File) {
      const { ensureUploadDir } = await import('@/db');
      const { UPLOAD_MIME_ALLOW, UPLOAD_MAX_BYTES } = await import('@/lib/validation');
      if (file.size > UPLOAD_MAX_BYTES) throw new ApiError(400, 'Attachment is too large (max 100 MB).');
      const ext = UPLOAD_MIME_ALLOW[file.type];
      if (!ext) throw new ApiError(400, 'Only images and audio files are allowed.');
      const id = user.id;
      const ts = Date.now();
      const fname = `q-${id}-${ts}.${ext}`;
      const dir = ensureUploadDir();
      const buf = Buffer.from(await file.arrayBuffer());
      fsWrite(path.join(dir, fname), buf);
      attachmentPath = `/uploads/${fname}`;
    }

    // AI preliminary answer (never blocks on failure)
    let aiAnswer: string | null = null;
    try {
      aiAnswer = await preliminaryAnswer(user, `${title}\n\n${body}`, null);
    } catch {
      aiAnswer = null;
    }

    // Assign to the first available teacher
    const teacher = db.prepare("SELECT id FROM users WHERE role = 'teacher' AND is_active = 1 ORDER BY id LIMIT 1").get() as unknown as { id: number } | undefined;

    const res = db
      .prepare(
        `INSERT INTO learner_questions (user_id, title, body, attachment_url, ai_answer, ai_answered_at, status, assigned_teacher_id)
         VALUES (?,?,?,?,?, datetime('now'), 'open', ?)`
      )
      .run(user.id, title, body, attachmentPath, aiAnswer, teacher?.id ?? null);
    const questionId = Number(res.lastInsertRowid);

    // Notify teachers
    if (teacher) notify(db, teacher.id, 'teacher', `New question: ${title}`, `${user.name} asked in a lesson.`, '/organizer/questions');
    return json({ ok: true, question_id: questionId, ai_answer: aiAnswer }, 201);
  });
}

// Small indirection so the file write happens in a server context with node:fs
import fs from 'node:fs';
import path from 'node:path';
function fsWrite(p: string, buf: Buffer) {
  fs.writeFileSync(p, buf);
}
