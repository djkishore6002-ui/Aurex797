import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { newId, ok, certNumber } from '../utils/helpers';

const router = Router();

router.get('/', (req, res) => {
  const { q, published = '1' } = req.query as Record<string, string>;
  const where: string[] = [];
  const args: any[] = [];
  if (published === '1') where.push('w.published=1');
  if (q) { where.push('(w.title LIKE ? OR w.description LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const items = db.prepare(`
    SELECT w.*, u.name as instructor_name,
      (SELECT COUNT(*) FROM registrations r WHERE r.workshop_id=w.id) as registered
    FROM workshops w JOIN users u ON u.id=w.instructor_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY w.created_at DESC LIMIT 50
  `).all(...args);
  res.json(ok({ items }));
});

const workshopSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  meeting_url: z.string().url().min(5),
  capacity: z.number().int().min(1).default(50),
  is_paid: z.boolean().default(false),
  price: z.number().min(0).default(0),
  start_time: z.string(), // ISO
  duration_minutes: z.number().int().min(15).default(60),
  instructor_id: z.string().optional(),
});

router.post('/', authRequired, requireRole('admin', 'organizer'), (req: AuthRequest, res) => {
  const parsed = workshopSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const id = newId('w_');
  const instructorId = parsed.data.instructor_id || req.user!.sub;
  db.prepare(`INSERT INTO workshops (id,title,description,instructor_id,organizer_id,meeting_url,capacity,is_paid,price,published)
              VALUES (?,?,?,?,?,?,?,?,?,1)`).run(
    id, parsed.data.title, parsed.data.description, instructorId, req.user!.sub,
    parsed.data.meeting_url, parsed.data.capacity, parsed.data.is_paid ? 1 : 0, parsed.data.price
  );
  // Session
  const start = new Date(parsed.data.start_time);
  const end = new Date(start.getTime() + parsed.data.duration_minutes * 60000);
  const sid = newId('ws_');
  db.prepare('INSERT INTO workshop_sessions (id,workshop_id,start_time,end_time,duration_minutes,required_minutes) VALUES (?,?,?,?,?,?)')
    .run(sid, id, start.toISOString(), end.toISOString(), parsed.data.duration_minutes, Math.ceil(parsed.data.duration_minutes * 0.9));
  res.json(ok({ id, session_id: sid }));
});

router.get('/:id', (req, res) => {
  const w = db.prepare('SELECT w.*, u.name as instructor_name FROM workshops w JOIN users u ON u.id=w.instructor_id WHERE w.id=?').get(req.params.id) as any;
  if (!w) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const sessions = db.prepare('SELECT * FROM workshop_sessions WHERE workshop_id=? ORDER BY start_time').all(w.id);
  const registered = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE workshop_id=?').get(w.id) as any).c;
  res.json(ok({ workshop: w, sessions, registered }));
});

router.post('/:id/register', authRequired, (req: AuthRequest, res) => {
  const w = db.prepare('SELECT * FROM workshops WHERE id=?').get(req.params.id) as any;
  if (!w || !w.published) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const existing = db.prepare('SELECT id FROM registrations WHERE user_id=? AND workshop_id=?').get(req.user!.sub, w.id);
  if (existing) return res.json(ok({ registered: true, id: (existing as any).id }));
  const count = (db.prepare('SELECT COUNT(*) as c FROM registrations WHERE workshop_id=?').get(w.id) as any).c;
  if (count >= w.capacity) return res.status(400).json({ success: false, error: { code: 'FULL', message: 'Workshop full' } });
  const id = newId('reg_');
  const payment = w.is_paid ? 'pending' : 'free';
  db.prepare('INSERT INTO registrations (id,user_id,workshop_id,payment_status) VALUES (?,?,?,?)')
    .run(id, req.user!.sub, w.id, payment);
  // Notification
  db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)').run(
    newId('n_'), req.user!.sub, 'workshop_registered', 'Registered!', `You registered for "${w.title}"`, `/workshops/${w.id}`
  );
  res.json(ok({ id, payment_status: payment }));
});

router.get('/my/registrations', authRequired, (req: AuthRequest, res) => {
  const items = db.prepare(`
    SELECT r.*, w.title, w.meeting_url, ws.start_time, ws.end_time
    FROM registrations r
    JOIN workshops w ON w.id=r.workshop_id
    LEFT JOIN workshop_sessions ws ON ws.workshop_id=w.id
    WHERE r.user_id=? ORDER BY ws.start_time DESC
  `).all(req.user!.sub);
  res.json(ok({ items }));
});

// Check-in / join session
router.post('/sessions/:sid/checkin', authRequired, (req: AuthRequest, res) => {
  const sess = db.prepare('SELECT * FROM workshop_sessions WHERE id=?').get(req.params.sid) as any;
  if (!sess) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const reg = db.prepare('SELECT * FROM registrations WHERE user_id=? AND workshop_id=?').get(req.user!.sub, sess.workshop_id) as any;
  if (!reg) return res.status(403).json({ success: false, error: { code: 'NOT_REGISTERED', message: 'Register first' } });
  let att = db.prepare('SELECT * FROM attendance WHERE user_id=? AND session_id=?').get(req.user!.sub, sess.id) as any;
  const now = new Date().toISOString();
  if (!att) {
    const id = newId('att_');
    db.prepare('INSERT INTO attendance (id,user_id,session_id,workshop_id,join_time,duration_minutes,status) VALUES (?,?,?,?,?,0,\'present\')')
      .run(id, req.user!.sub, sess.id, sess.workshop_id, now);
    db.prepare('UPDATE registrations SET checked_in=1 WHERE user_id=? AND workshop_id=?').run(req.user!.sub, sess.workshop_id);
  }
  res.json(ok({ checked_in: true, join_time: att?.join_time || now }));
});

// Leave session (compute duration)
router.post('/sessions/:sid/leave', authRequired, (req: AuthRequest, res) => {
  const sess = db.prepare('SELECT * FROM workshop_sessions WHERE id=?').get(req.params.sid) as any;
  if (!sess) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const att = db.prepare('SELECT * FROM attendance WHERE user_id=? AND session_id=?').get(req.user!.sub, sess.id) as any;
  if (!att) return res.status(400).json({ success: false, error: { code: 'NO_CHECKIN', message: 'Not checked in' } });
  const now = new Date();
  const join = new Date(att.join_time);
  let minutes = Math.max(0, (now.getTime() - join.getTime()) / 60000);
  // clamp by session duration
  minutes = Math.min(minutes, sess.duration_minutes);
  const status = minutes >= sess.required_minutes ? 'present' : minutes >= sess.required_minutes * 0.5 ? 'partial' : 'absent';
  db.prepare('UPDATE attendance SET leave_time=?, duration_minutes=?, status=? WHERE id=?')
    .run(now.toISOString(), Math.round(minutes), status, att.id);
  // Award XP
  const xpGain = 20;
  db.prepare('UPDATE profiles SET xp = xp + ? WHERE user_id=?').run(xpGain, req.user!.sub);
  // Try auto-issue certificate if overall >= 90%
  issueCertificateIfEligible(req.user!.sub, sess.workshop_id);
  res.json(ok({ duration_minutes: Math.round(minutes), status }));
});

// Organizer-triggered certificate issuance
router.post('/:id/certificates/generate', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const w = db.prepare('SELECT * FROM workshops WHERE id=?').get(req.params.id) as any;
  if (!w) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  if (req.user!.role !== 'admin' && w.organizer_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  const users = db.prepare('SELECT user_id FROM registrations WHERE workshop_id=?').all(w.id) as any[];
  const issued: any[] = [];
  for (const u of users) {
    const cert = issueCertificateIfEligible(u.user_id, w.id, true);
    if (cert) issued.push(cert);
  }
  res.json(ok({ issued: issued.length, certificates: issued }));
});

export function computeAttendance(userId: string, workshopId: string): number {
  const sessions = db.prepare('SELECT id, required_minutes, duration_minutes FROM workshop_sessions WHERE workshop_id=?').all(workshopId) as any[];
  if (!sessions.length) return 0;
  let required = 0;
  let attended = 0;
  for (const s of sessions) {
    required += s.required_minutes;
    const a = db.prepare('SELECT duration_minutes FROM attendance WHERE user_id=? AND session_id=?').get(userId, s.id) as any;
    if (a) attended += Math.min(a.duration_minutes, s.duration_minutes);
  }
  if (required <= 0) return 0;
  return Math.min(100, Math.round((attended / required) * 1000) / 10);
}

export function issueCertificateIfEligible(userId: string, workshopId: string, force = false) {
  const w = db.prepare('SELECT * FROM workshops WHERE id=?').get(workshopId) as any;
  if (!w) return null;
  const exists = db.prepare('SELECT id FROM certificates WHERE user_id=? AND workshop_id=?').get(userId, workshopId);
  if (exists && !force) return null;
  const pct = computeAttendance(userId, workshopId);
  if (pct < 90 && !force) return null;
  const user = db.prepare('SELECT name FROM users WHERE id=?').get(userId) as any;
  const organizer = db.prepare('SELECT name FROM users WHERE id=?').get(w.organizer_id) as any;
  const id = newId('cert_');
  const cn = certNumber();
  const qrData = JSON.stringify({ cert: cn, user: user.name, workshop: w.title, pct, issued: new Date().toISOString() });
  if (exists) {
    db.prepare('UPDATE certificates SET attendance_percent=?, revoked=0, issued_at=datetime(\'now\'), qr_data=? WHERE id=?')
      .run(pct, qrData, (exists as any).id);
    return { id: (exists as any).id, cert_number: cn, attendance_percent: pct };
  }
  db.prepare(`INSERT INTO certificates (id,cert_number,user_id,workshop_id,title,issuer,attendance_percent,qr_data)
              VALUES (?,?,?,?,?,?,?,?)`).run(
    id, cn, userId, workshopId, w.title, organizer?.name || 'Aurex Academy', pct, qrData
  );
  db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)').run(
    newId('n_'), userId, 'certificate', 'Certificate issued!', `Your certificate for "${w.title}" is ready.`, `/certificates/${cn}`
  );
  return { id, cert_number: cn, attendance_percent: pct };
}

// Attendance for workshop (organizer view)
router.get('/:id/attendance', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const w = db.prepare('SELECT * FROM workshops WHERE id=?').get(req.params.id) as any;
  if (!w) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  if (req.user!.role !== 'admin' && w.organizer_id !== req.user!.sub) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
  const regs = db.prepare(`
    SELECT r.id, r.user_id, u.name, u.email, r.checked_in
    FROM registrations r JOIN users u ON u.id=r.user_id
    WHERE r.workshop_id=? ORDER BY u.name
  `).all(w.id) as any[];
  const result = regs.map(r => ({
    ...r,
    attendance_percent: computeAttendance(r.user_id, w.id),
    eligible: computeAttendance(r.user_id, w.id) >= 90,
    sessions: db.prepare('SELECT s.id, s.start_time, s.required_minutes, a.join_time, a.leave_time, a.duration_minutes, a.status FROM workshop_sessions s LEFT JOIN attendance a ON a.session_id=s.id AND a.user_id=? WHERE s.workshop_id=? ORDER BY s.start_time').all(r.user_id, w.id),
  }));
  res.json(ok({ workshop: w, roster: result }));
});

// My workshop attendance
router.get('/:id/my-attendance', authRequired, (req: AuthRequest, res) => {
  const w = db.prepare('SELECT * FROM workshops WHERE id=?').get(req.params.id) as any;
  if (!w) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const pct = computeAttendance(req.user!.sub, w.id);
  const sessions = db.prepare(`
    SELECT s.id, s.start_time, s.end_time, s.required_minutes, a.join_time, a.leave_time, a.duration_minutes, a.status
    FROM workshop_sessions s LEFT JOIN attendance a ON a.session_id=s.id AND a.user_id=?
    WHERE s.workshop_id=? ORDER BY s.start_time
  `).all(req.user!.sub, w.id);
  const cert = db.prepare('SELECT cert_number, issued_at, attendance_percent FROM certificates WHERE user_id=? AND workshop_id=? AND revoked=0')
    .get(req.user!.sub, w.id);
  res.json(ok({ attendance_percent: pct, eligible: pct >= 90, required: 90, sessions, certificate: cert }));
});

export default router;
