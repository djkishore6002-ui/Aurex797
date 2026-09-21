import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { newId, ok } from '../utils/helpers';

const router = Router();

// List published courses (public)
router.get('/', (req, res) => {
  const { level, category, q, page = '1', per_page = '20' } = req.query as Record<string, string>;
  const p = Math.max(1, parseInt(page));
  const pp = Math.min(50, Math.max(1, parseInt(per_page)));
  const where: string[] = ['published=1'];
  const args: any[] = [];
  if (level) { where.push('level=?'); args.push(level); }
  if (category) { where.push('category=?'); args.push(category); }
  if (q) { where.push('(title LIKE ? OR description LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const sql = `SELECT * FROM courses WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  const items = db.prepare(sql).all(...args, pp, (p - 1) * pp) as any[];
  const total = (db.prepare(`SELECT COUNT(*) as c FROM courses WHERE ${where.join(' AND ')}`).get(...args) as any).c;
  res.json(ok({ items, total, page: p, per_page: pp }));
});

// Search across courses, lessons, workshops, vocab (public endpoint)
router.get('/search/all', (req, res) => {
  const q = `%${(req.query.q as string) || ''}%`;
  if (!q || q === '%%') return res.json(ok({ courses: [], lessons: [], workshops: [], vocab: [] }));
  const courses = db.prepare('SELECT id,title,description,level,category,thumbnail_url FROM courses WHERE published=1 AND (title LIKE ? OR description LIKE ?) LIMIT 20').all(q, q);
  const lessons = db.prepare('SELECT id,title,course_id,type FROM lessons WHERE published=1 AND (title LIKE ? OR description LIKE ?) LIMIT 20').all(q, q);
  const workshops = db.prepare('SELECT id,title,description FROM workshops WHERE published=1 AND (title LIKE ? OR description LIKE ?) LIMIT 20').all(q, q);
  const vocab = db.prepare('SELECT id,tamil,transliteration,meaning,category FROM vocabularies WHERE tamil LIKE ? OR transliteration LIKE ? OR meaning LIKE ? LIMIT 20').all(q, q, q);
  res.json(ok({ courses, lessons, workshops, vocab }));
});

// Create course (organizer+)
const courseSchema = z.object({
  title: z.string().min(2),
  title_ta: z.string().optional(),
  description: z.string().min(5),
  description_ta: z.string().optional(),
  thumbnail_url: z.string().url().optional().or(z.literal('').transform(() => null)),
  level: z.enum(['absolute_beginner', 'beginner', 'intermediate', 'advanced']),
  explanation_language: z.enum(['en','hi','te','ml','kn','ta']).default('en'),
  category: z.string().min(2).default('General'),
});
router.post('/', authRequired, requireRole('admin', 'organizer'), (req: AuthRequest, res) => {
  const parsed = courseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const id = newId('c_');
  db.prepare(`INSERT INTO courses (id,title,title_ta,description,description_ta,thumbnail_url,level,explanation_language,instructor_id,category,published)
              VALUES (?,?,?,?,?,?,?,?,?,?,0)`).run(
    id, parsed.data.title, parsed.data.title_ta || null, parsed.data.description, parsed.data.description_ta || null,
    parsed.data.thumbnail_url || null, parsed.data.level, parsed.data.explanation_language, req.user!.sub, parsed.data.category
  );
  res.json(ok({ id }));
});

// Get course detail (if unpublished, only instructor/admin)
router.get('/:id', (req, res) => {
  const course = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id) as any;
  if (!course) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
  const auth = (req as any).user;
  if (!course.published && (!auth || (auth.role !== 'admin' && auth.sub !== course.instructor_id))) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
  }
  const modules = db.prepare('SELECT * FROM course_modules WHERE course_id=? ORDER BY sort_order ASC').all(course.id) as any[];
  for (const m of modules) {
    m.lessons = db.prepare('SELECT id,title,title_ta,type,duration_seconds,sort_order,published FROM lessons WHERE module_id=? ORDER BY sort_order ASC').all(m.id);
  }
  const instructor = course.instructor_id ? db.prepare('SELECT id,name,avatar_url FROM users WHERE id=?').get(course.instructor_id) : null;
  res.json(ok({ course, modules, instructor }));
});

// Publish / unpublish
router.post('/:id/publish', authRequired, requireRole('admin', 'organizer'), (req: AuthRequest, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id) as any;
  if (!c) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not found' } });
  if (req.user!.role !== 'admin' && c.instructor_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  db.prepare('UPDATE courses SET published=1, updated_at=datetime(\'now\') WHERE id=?').run(req.params.id);
  res.json(ok({ published: true }));
});

// Create module
router.post('/:id/modules', authRequired, requireRole('admin', 'organizer'), (req: AuthRequest, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id) as any;
  if (!c) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  if (req.user!.role !== 'admin' && c.instructor_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  const { title } = req.body;
  if (!title) return res.status(400).json({ success: false, error: { message: 'title required' } });
  const id = newId('m_');
  const max = (db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM course_modules WHERE course_id=?').get(c.id) as any).m;
  db.prepare('INSERT INTO course_modules (id,course_id,title,sort_order) VALUES (?,?,?,?)').run(id, c.id, title, max + 1);
  res.json(ok({ id }));
});

// Create lesson
const lessonSchema = z.object({
  module_id: z.string(),
  title: z.string().min(1),
  title_ta: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['video','vocabulary','grammar','scenario','reading','quiz']).default('video'),
  duration_seconds: z.number().int().min(0).default(0),
  video_url: z.string().optional(),
  transcript: z.string().optional(),
  content_json: z.any().optional(),
});
router.post('/:id/lessons', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const parsed = lessonSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id) as any;
  if (!c) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  if (req.user!.role !== 'admin' && c.instructor_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  const mod = db.prepare('SELECT * FROM course_modules WHERE id=? AND course_id=?').get(parsed.data.module_id, c.id) as any;
  if (!mod) return res.status(400).json({ success: false, error: { message: 'Invalid module' } });
  const id = newId('l_');
  const max = (db.prepare('SELECT COALESCE(MAX(sort_order),0) as m FROM lessons WHERE module_id=?').get(mod.id) as any).m;
  db.prepare(`INSERT INTO lessons (id,module_id,course_id,title,title_ta,description,type,duration_seconds,sort_order,video_url,transcript,content_json,published)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`).run(
    id, mod.id, c.id, parsed.data.title, parsed.data.title_ta || null, parsed.data.description || null,
    parsed.data.type, parsed.data.duration_seconds, max + 1, parsed.data.video_url || null,
    parsed.data.transcript || null, parsed.data.content_json ? JSON.stringify(parsed.data.content_json) : null
  );
  res.json(ok({ id }));
});

// Lesson detail
router.get('/lessons/:id', authRequired, (req: AuthRequest, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id) as any;
  if (!lesson) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const course = db.prepare('SELECT * FROM courses WHERE id=?').get(lesson.course_id) as any;
  const progress = db.prepare('SELECT * FROM lesson_progress WHERE user_id=? AND lesson_id=?').get(req.user!.sub, lesson.id) as any;
  const vocab = db.prepare('SELECT * FROM vocabularies WHERE lesson_id=? ORDER BY id LIMIT 100').all(lesson.id);
  const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id=?').get(lesson.id) as any;
  let questions: any[] = [];
  if (quiz) {
    questions = (db.prepare('SELECT id,question,question_ta,options,explanation FROM quiz_questions WHERE quiz_id=?').all(quiz.id) as any[]).map(q => ({ ...q, options: JSON.parse(q.options) }));
  }
  let content = null;
  try { content = lesson.content_json ? JSON.parse(lesson.content_json) : null; } catch {}
  res.json(ok({ lesson: { ...lesson, content_json: content }, course, progress, vocab, quiz: quiz ? { ...quiz, questions } : null }));
});

// Enroll
router.post('/:id/enroll', authRequired, (req: AuthRequest, res) => {
  const c = db.prepare('SELECT * FROM courses WHERE id=?').get(req.params.id) as any;
  if (!c || !c.published) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const existing = db.prepare('SELECT id FROM enrollments WHERE user_id=? AND course_id=?').get(req.user!.sub, c.id);
  if (existing) return res.json(ok({ enrolled: true }));
  const id = newId('e_');
  db.prepare('INSERT INTO enrollments (id,user_id,course_id) VALUES (?,?,?)').run(id, req.user!.sub, c.id);
  db.prepare('UPDATE courses SET enrollment_count=enrollment_count+1 WHERE id=?').run(c.id);
  res.json(ok({ id, enrolled: true }));
});

// My enrollments
router.get('/my/enrollments', authRequired, (req: AuthRequest, res) => {
  const items = db.prepare(`
    SELECT e.*, c.title, c.thumbnail_url, c.level, c.description FROM enrollments e
    JOIN courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.enrolled_at DESC
  `).all(req.user!.sub);
  res.json(ok({ items }));
});

// Video progress / heartbeat
const progressSchema = z.object({
  last_position_seconds: z.number().min(0),
  watched_seconds: z.number().min(0).optional(),
  duration_seconds: z.number().min(0).optional(),
});
router.post('/lessons/:id/progress', authRequired, (req: AuthRequest, res) => {
  const parsed = progressSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id) as any;
  if (!lesson) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const { last_position_seconds, watched_seconds, duration_seconds } = parsed.data;
  const existing = db.prepare('SELECT * FROM lesson_progress WHERE user_id=? AND lesson_id=?').get(req.user!.sub, lesson.id) as any;
  const dur = duration_seconds || lesson.duration_seconds || 1;
  // compute completion % based on position against duration; count meaningful progress.
  const compPct = Math.min(100, Math.max(existing?.completion_percent || 0, Math.round((last_position_seconds / Math.max(dur, 1)) * 100)));
  const completed = compPct >= 90 ? 1 : 0;
  const newWatched = Math.max(existing?.watched_seconds || 0, watched_seconds ?? last_position_seconds);
  if (existing) {
    db.prepare(`UPDATE lesson_progress SET last_position_seconds=?, watched_seconds=?, completion_percent=?, completed=?, updated_at=datetime('now')
                WHERE user_id=? AND lesson_id=?`).run(last_position_seconds, newWatched, compPct, completed, req.user!.sub, lesson.id);
  } else {
    const id = newId('lp_');
    db.prepare(`INSERT INTO lesson_progress (id,user_id,lesson_id,last_position_seconds,watched_seconds,completion_percent,completed)
                VALUES (?,?,?,?,?,?,?)`).run(id, req.user!.sub, lesson.id, last_position_seconds, newWatched, compPct, completed);
  }
  // Update streak / XP on completion
  if (completed && !(existing?.completed)) {
    // +20 XP per lesson completion; +5 per non-completing heartbeat capped elsewhere
    db.prepare('UPDATE profiles SET xp = xp + 20 WHERE user_id=?').run(req.user!.sub);
    updateStreak(req.user!.sub);
    // Update enrollment progress
    refreshEnrollmentProgress(req.user!.sub, lesson.course_id);
    // Notify
    db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)').run(
      newId('n_'), req.user!.sub, 'lesson_complete', 'Lesson completed!',
      `You finished "${lesson.title}". +20 XP`, `/learn/${lesson.course_id}/lessons/${lesson.id}`
    );
  } else if (!existing) {
    db.prepare('UPDATE profiles SET xp = xp + 5 WHERE user_id=?').run(req.user!.sub);
  }
  res.json(ok({ completion_percent: compPct, completed: !!completed }));
});

function updateStreak(userId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const p = db.prepare('SELECT streak_days, last_active_date FROM profiles WHERE user_id=?').get(userId) as any;
  let streak = p.streak_days || 0;
  if (p.last_active_date === today) return;
  const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (p.last_active_date === yest) streak += 1;
  else streak = 1;
  db.prepare('UPDATE profiles SET streak_days=?, last_active_date=? WHERE user_id=?').run(streak, today, userId);
}

function refreshEnrollmentProgress(userId: string, courseId: string) {
  const total = (db.prepare('SELECT COUNT(*) as c FROM lessons WHERE course_id=? AND published=1').get(courseId) as any).c;
  const done = (db.prepare(`SELECT COUNT(*) as c FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id
                            WHERE lp.user_id=? AND l.course_id=? AND lp.completed=1 AND l.published=1`).get(userId, courseId) as any).c;
  const pct = total ? Math.round((done / total) * 100) : 0;
  db.prepare('UPDATE enrollments SET progress_percent=?, completed=? WHERE user_id=? AND course_id=?')
    .run(pct, pct >= 100 ? 1 : 0, userId, courseId);
}

// Quiz submission
const quizSubmit = z.object({
  answers: z.array(z.number().int()),
  idempotency_key: z.string().min(4).max(64),
});
router.post('/lessons/:id/quiz/submit', authRequired, (req: AuthRequest, res) => {
  const parsed = quizSubmit.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const quiz = db.prepare('SELECT * FROM quizzes WHERE lesson_id=?').get(req.params.id) as any;
  if (!quiz) return res.status(404).json({ success: false, error: { code: 'NO_QUIZ' } });
  const questions = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id=? ORDER BY id').all(quiz.id) as any[];
  let score = 0;
  for (let i = 0; i < questions.length; i++) {
    if (parsed.data.answers[i] === questions[i].correct_index) score++;
  }
  // Idempotency
  const existing = db.prepare('SELECT * FROM quiz_attempts WHERE user_id=? AND quiz_id=? AND idempotency_key=?')
    .get(req.user!.sub, quiz.id, parsed.data.idempotency_key);
  if (existing) return res.json(ok({ score, total: questions.length, xpAwarded: 0, idempotent: true }));
  const id = newId('qa_');
  db.prepare('INSERT INTO quiz_attempts (id,user_id,quiz_id,score,total,answers,idempotency_key) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user!.sub, quiz.id, score, questions.length, JSON.stringify(parsed.data.answers), parsed.data.idempotency_key);
  const xp = score === questions.length ? 25 : Math.round((score / Math.max(questions.length, 1)) * 15);
  db.prepare('UPDATE profiles SET xp = xp + ? WHERE user_id=?').run(xp, req.user!.sub);
  updateStreak(req.user!.sub);
  res.json(ok({ score, total: questions.length, xpAwarded: xp }));
});

// Add vocabulary (organizer)
const vocabSchema = z.object({
  tamil: z.string().min(1),
  transliteration: z.string().min(1),
  meaning: z.string().min(1),
  meaning_lang: z.enum(['en','hi','te','ml','kn','ta']).default('en'),
  category: z.string().optional(),
  difficulty: z.enum(['absolute_beginner','beginner','intermediate','advanced']).default('beginner'),
  example: z.string().optional(),
});
router.post('/lessons/:id/vocab', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const parsed = vocabSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const l = db.prepare('SELECT id,course_id FROM lessons WHERE id=?').get(req.params.id) as any;
  if (!l) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const id = newId('v_');
  db.prepare(`INSERT INTO vocabularies (id,lesson_id,tamil,transliteration,meaning,meaning_lang,category,difficulty,example)
              VALUES (?,?,?,?,?,?,?,?,?)`).run(
    id, l.id, parsed.data.tamil, parsed.data.transliteration, parsed.data.meaning, parsed.data.meaning_lang,
    parsed.data.category || null, parsed.data.difficulty, parsed.data.example || null
  );
  res.json(ok({ id }));
});

// Public vocabulary browse
router.get('/vocab/list', (req, res) => {
  const { category, difficulty, limit = '50' } = req.query as Record<string, string>;
  const where: string[] = [];
  const args: any[] = [];
  if (category) { where.push('category=?'); args.push(category); }
  if (difficulty) { where.push('difficulty=?'); args.push(difficulty); }
  const sql = `SELECT * FROM vocabularies ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id LIMIT ?`;
  args.push(Math.min(200, parseInt(limit)));
  const items = db.prepare(sql).all(...args);
  res.json(ok({ items }));
});

// Continue learning (for dashboard)
router.get('/continue/learning', authRequired, (req: AuthRequest, res) => {
  const items = db.prepare(`
    SELECT lp.*, l.title, l.title_ta, l.type, l.thumbnail_url, l.course_id, c.title as course_title
    FROM lesson_progress lp
    JOIN lessons l ON l.id=lp.lesson_id
    JOIN courses c ON c.id=l.course_id
    WHERE lp.user_id=? AND lp.completed=0 AND lp.completion_percent > 0 AND l.published=1
    ORDER BY lp.updated_at DESC LIMIT 6
  `).all(req.user!.sub);
  res.json(ok({ items }));
});

// Learner stats
router.get('/stats/me', authRequired, (req: AuthRequest, res) => {
  const p = db.prepare('SELECT xp, streak_days, daily_goal_minutes FROM profiles WHERE user_id=?').get(req.user!.sub) as any;
  const wordsLearned = (db.prepare('SELECT COUNT(DISTINCT vocabularies.id) as c FROM vocabularies JOIN lessons ON lessons.id=vocabularies.lesson_id JOIN lesson_progress lp ON lp.lesson_id=lessons.id WHERE lp.user_id=? AND lp.completed=1').get(req.user!.sub) as any).c;
  const lessonsCompleted = (db.prepare('SELECT COUNT(*) as c FROM lesson_progress WHERE user_id=? AND completed=1').get(req.user!.sub) as any).c;
  const coursesEnrolled = (db.prepare('SELECT COUNT(*) as c FROM enrollments WHERE user_id=?').get(req.user!.sub) as any).c;
  const certs = db.prepare('SELECT COUNT(*) as c FROM certificates WHERE user_id=? AND revoked=0').get(req.user!.sub) as any;
  res.json(ok({ xp: p.xp, streak: p.streak_days, dailyGoal: p.daily_goal_minutes, wordsLearned, lessonsCompleted, coursesEnrolled, certificates: certs.c }));
});

export default router;
