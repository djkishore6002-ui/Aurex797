import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { newId, ok } from '../utils/helpers';
import { generate } from '../ai/gateway';

const router = Router();

const qSchema = z.object({
  body: z.string().min(2).max(2000),
  lesson_id: z.string().optional(),
  course_id: z.string().optional(),
  workshop_id: z.string().optional(),
});

// Ask question (learner)
router.post('/', authRequired, async (req: AuthRequest, res) => {
  const parsed = qSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const id = newId('q_');
  db.prepare(`INSERT INTO questions (id,user_id,lesson_id,course_id,workshop_id,body,status) VALUES (?,?,?,?,?,?, 'pending')`)
    .run(id, req.user!.sub, parsed.data.lesson_id || null, parsed.data.course_id || null, parsed.data.workshop_id || null, parsed.data.body);

  // Auto-AI answer
  try {
    const profile = db.prepare('SELECT level,native_language FROM profiles WHERE user_id=?').get(req.user!.sub) as any;
    const ai = await generate({
      userId: req.user!.sub,
      userMessage: `A learner asks: "${parsed.data.body}". Provide a helpful, accurate Tamil-learning answer with Tamil script, transliteration, and translation to ${profile?.native_language || 'English'}. Keep it concise (3-5 sentences).`,
      context: { level: profile?.level },
    });
    db.prepare("UPDATE questions SET ai_answer=?, status='ai_answered' WHERE id=?").run(ai.reply, id);
    db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)').run(
      newId('n_'), req.user!.sub, 'question_answered', 'AI answered your question', parsed.data.body.slice(0, 80), `/questions/${id}`
    );
  } catch {}

  const q = db.prepare('SELECT * FROM questions WHERE id=?').get(id);
  res.json(ok(q));
});

router.get('/', authRequired, (req: AuthRequest, res) => {
  const { status, course_id, mine } = req.query as Record<string, string>;
  const where: string[] = [];
  const args: any[] = [];
  if (req.user!.role === 'learner' || mine === '1') { where.push('q.user_id=?'); args.push(req.user!.sub); }
  if (status) { where.push('q.status=?'); args.push(status); }
  if (course_id) { where.push('q.course_id=?'); args.push(course_id); }
  const items = db.prepare(`
    SELECT q.*, u.name as asker_name FROM questions q JOIN users u ON u.id=q.user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY q.created_at DESC LIMIT 100
  `).all(...args);
  res.json(ok({ items }));
});

router.get('/:id', authRequired, (req: AuthRequest, res) => {
  const q = db.prepare('SELECT q.*, u.name as asker_name FROM questions q JOIN users u ON u.id=q.user_id WHERE q.id=?').get(req.params.id) as any;
  if (!q) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  if (req.user!.role === 'learner' && q.user_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  res.json(ok(q));
});

// Teacher responds
const ansSchema = z.object({
  answer: z.string().min(1).max(4000),
  action: z.enum(['answer','edit_ai','reject','resolve']).default('answer'),
});
router.post('/:id/respond', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const parsed = ansSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const q = db.prepare('SELECT * FROM questions WHERE id=?').get(req.params.id) as any;
  if (!q) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const status = parsed.data.action === 'resolve' ? 'resolved' : 'teacher_reviewed';
  db.prepare(`UPDATE questions SET teacher_answer=?, answered_by=?, status=? WHERE id=?`)
    .run(parsed.data.answer, req.user!.sub, status, req.params.id);
  db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)').run(
    newId('n_'), q.user_id, 'teacher_reply', 'A teacher replied to your question', parsed.data.answer.slice(0, 100), `/questions/${q.id}`
  );
  res.json(ok({ status }));
});

// Teacher analytics
router.get('/stats/overview', authRequired, requireRole('admin','organizer'), (_req, res) => {
  const total = (db.prepare('SELECT COUNT(*) as c FROM questions').get() as any).c;
  const ai = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status='ai_answered'").get() as any).c;
  const teacher = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status IN ('teacher_reviewed','resolved')").get() as any).c;
  const pending = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status='pending'").get() as any).c;
  res.json(ok({ total, ai_answered: ai, teacher_answered: teacher, pending }));
});

export default router;
