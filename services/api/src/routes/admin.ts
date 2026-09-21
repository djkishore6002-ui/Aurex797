import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { hashPassword } from '../utils/auth';
import { newId, ok } from '../utils/helpers';

const router = Router();

// All /api/admin/* require admin
router.use(authRequired, requireRole('admin'));

router.get('/stats', (_req, res) => {
  const users = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role='learner'").get() as any).c;
  const organizers = (db.prepare("SELECT COUNT(*) as c FROM users WHERE role='organizer'").get() as any).c;
  const courses = (db.prepare('SELECT COUNT(*) as c FROM courses WHERE published=1').get() as any).c;
  const workshops = (db.prepare('SELECT COUNT(*) as c FROM workshops WHERE published=1').get() as any).c;
  const enrollments = (db.prepare('SELECT COUNT(*) as c FROM enrollments').get() as any).c;
  const certificates = (db.prepare('SELECT COUNT(*) as c FROM certificates').get() as any).c;
  res.json(ok({ users, organizers, courses, workshops, enrollments, certificates }));
});

router.get('/users', (req, res) => {
  const { role, q } = req.query as Record<string, string>;
  const where: string[] = [];
  const args: any[] = [];
  if (role) { where.push('role=?'); args.push(role); }
  if (q) { where.push('(name LIKE ? OR email LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const items = db.prepare(`SELECT id,email,name,role,created_at,banned FROM users ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC LIMIT 200`).all(...args);
  res.json(ok({ items }));
});

const createOrg = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.enum(['organizer', 'admin']).default('organizer'),
});
router.post('/users', async (req, res) => {
  const parsed = createOrg.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(parsed.data.email.toLowerCase());
  if (existing) return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'Email exists' } });
  const id = newId('u_');
  const hash = await hashPassword(parsed.data.password);
  db.prepare('INSERT INTO users (id,email,password_hash,name,role,email_verified) VALUES (?,?,?,?,?,1)')
    .run(id, parsed.data.email.toLowerCase(), hash, parsed.data.name, parsed.data.role);
  db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(id);
  db.prepare('INSERT INTO ai_provider_settings (user_id,mode,provider) VALUES (?,?,?)').run(id, 'platform', process.env.OPENROUTER_API_KEY ? 'openrouter' : 'mock');
  res.json(ok({ id }));
});

router.post('/users/:id/ban', (req, res) => {
  db.prepare('UPDATE users SET banned=1 WHERE id=?').run(req.params.id);
  res.json(ok({ banned: true }));
});
router.post('/users/:id/unban', (req, res) => {
  db.prepare('UPDATE users SET banned=0 WHERE id=?').run(req.params.id);
  res.json(ok({ banned: false }));
});

// Public certificate verification
export const verifyRouter = Router();
verifyRouter.get('/certificates/verify/:number', (req, res) => {
  const cert = db.prepare(`SELECT c.*, u.name as user_name FROM certificates c JOIN users u ON u.id=c.user_id
    WHERE c.cert_number=?`).get(req.params.number) as any;
  if (!cert || cert.revoked) return res.status(404).json({ success: false, error: { code: 'INVALID', message: 'Certificate not found or revoked' } });
  res.json(ok({
    valid: true,
    cert_number: cert.cert_number,
    name: cert.user_name,
    title: cert.title,
    issuer: cert.issuer,
    attendance_percent: cert.attendance_percent,
    issued_at: cert.issued_at,
  }));
});

// My certificates (any role)
export const myCertsRouter = Router();
myCertsRouter.use(authRequired);
myCertsRouter.get('/certificates/mine', (req: AuthRequest, res) => {
  const items = db.prepare('SELECT * FROM certificates WHERE user_id=? AND revoked=0 ORDER BY issued_at DESC').all(req.user!.sub);
  res.json(ok({ items }));
});

// Organizer dashboard stats
export const organizerRouter = Router();
organizerRouter.use(authRequired, requireRole('organizer', 'admin'));
organizerRouter.get('/organizer/stats', (req: AuthRequest, res) => {
  const uid = req.user!.sub;
  const courses = (db.prepare('SELECT COUNT(*) as c FROM courses WHERE instructor_id=?').get(uid) as any).c;
  const workshops = (db.prepare('SELECT COUNT(*) as c FROM workshops WHERE organizer_id=?').get(uid) as any).c;
  const learners = (db.prepare(`SELECT COUNT(DISTINCT e.user_id) as c FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE c.instructor_id=?`).get(uid) as any).c;
  const pending = (db.prepare("SELECT COUNT(*) as c FROM questions WHERE status='pending'").get() as any).c;
  const certs = (db.prepare(`SELECT COUNT(*) as c FROM certificates c JOIN workshops w ON w.id=c.workshop_id WHERE w.organizer_id=?`).get(uid) as any).c;
  res.json(ok({ courses, workshops, learners, pending_questions: pending, certificates: certs }));
});

// Offline sync (any authenticated user)
export const syncRouter = Router();
syncRouter.use(authRequired);
syncRouter.post('/sync', (req: AuthRequest, res) => {
  const events: any[] = req.body.events || [];
  const results: any[] = [];
  const applyEvent = (ev: any) => {
    try {
      switch (ev.event_type) {
        case 'progress': {
          const { lesson_id, last_position_seconds, watched_seconds, duration_seconds } = ev.payload;
          const lesson = db.prepare('SELECT course_id, duration_seconds FROM lessons WHERE id=?').get(lesson_id);
          if (!lesson) return { ok: false, error: 'no_lesson' };
          const dur = duration_seconds || (lesson as any).duration_seconds || 1;
          const existing = db.prepare('SELECT * FROM lesson_progress WHERE user_id=? AND lesson_id=?').get(req.user!.sub, lesson_id) as any;
          const compPct = Math.min(100, Math.max(existing?.completion_percent || 0, Math.round((last_position_seconds / Math.max(dur, 1)) * 100)));
          const completed = compPct >= 90 ? 1 : 0;
          const newWatched = Math.max(existing?.watched_seconds || 0, watched_seconds ?? last_position_seconds);
          if (existing) {
            db.prepare(`UPDATE lesson_progress SET last_position_seconds=?, watched_seconds=?, completion_percent=?, completed=?, updated_at=datetime('now') WHERE user_id=? AND lesson_id=?`).run(last_position_seconds, newWatched, compPct, completed, req.user!.sub, lesson_id);
          } else {
            const id = newId('lp_');
            db.prepare(`INSERT INTO lesson_progress (id,user_id,lesson_id,last_position_seconds,watched_seconds,completion_percent,completed) VALUES (?,?,?,?,?,?,?)`).run(id, req.user!.sub, lesson_id, last_position_seconds, newWatched, compPct, completed);
          }
          return { ok: true };
        }
        case 'quiz_attempt': {
          const { quiz_id, answers, score, total } = ev.payload;
          const existing = db.prepare('SELECT id FROM quiz_attempts WHERE user_id=? AND quiz_id=? AND idempotency_key=?').get(req.user!.sub, quiz_id, ev.idempotency_key);
          if (existing) return { ok: true, idempotent: true };
          const id = newId('qa_');
          db.prepare('INSERT INTO quiz_attempts (id,user_id,quiz_id,score,total,answers,idempotency_key) VALUES (?,?,?,?,?,?,?)')
            .run(id, req.user!.sub, quiz_id, score, total, JSON.stringify(answers), ev.idempotency_key);
          return { ok: true };
        }
        default:
          return { ok: false, error: 'unknown_type' };
      }
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };
  for (const ev of events) {
    try {
      db.prepare('INSERT INTO offline_sync_events (id,user_id,event_type,payload,idempotency_key,synced,synced_at) VALUES (?,?,?,?,?,1,datetime(\'now\'))')
        .run(newId('sy_'), req.user!.sub, ev.event_type, JSON.stringify(ev.payload), ev.idempotency_key);
    } catch { results.push({ idempotency_key: ev.idempotency_key, ok: true, idempotent: true }); continue; }
    const r = applyEvent(ev);
    results.push({ idempotency_key: ev.idempotency_key, ...r });
  }
  res.json(ok({ results }));
});

export default router;
