import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { newId, ok } from '../utils/helpers';

const router = Router();

router.get('/', (req, res) => {
  const { scope = 'global', scope_id } = req.query as Record<string, string>;
  const where: string[] = ['scope=?'];
  const args: any[] = [scope];
  if (scope_id) { where.push('scope_id=?'); args.push(scope_id); }
  const items = db.prepare(`SELECT a.*, u.name as author FROM announcements a JOIN users u ON u.id=a.author_id
    WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT 50`).all(...args);
  res.json(ok({ items }));
});

const schema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  scope: z.enum(['global','course','workshop']).default('global'),
  scope_id: z.string().optional(),
  notify_users: z.boolean().optional(),
});
router.post('/', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const id = newId('an_');
  db.prepare('INSERT INTO announcements (id,author_id,scope,scope_id,title,body) VALUES (?,?,?,?,?,?)')
    .run(id, req.user!.sub, parsed.data.scope, parsed.data.scope_id || null, parsed.data.title, parsed.data.body);

  if (parsed.data.notify_users) {
    let users: any[] = [];
    if (parsed.data.scope === 'global') {
      users = db.prepare('SELECT id FROM users').all() as any[];
    } else if (parsed.data.scope === 'course' && parsed.data.scope_id) {
      users = db.prepare('SELECT user_id as id FROM enrollments WHERE course_id=?').all(parsed.data.scope_id) as any[];
    } else if (parsed.data.scope === 'workshop' && parsed.data.scope_id) {
      users = db.prepare('SELECT user_id as id FROM registrations WHERE workshop_id=?').all(parsed.data.scope_id) as any[];
    }
    const ins = db.prepare('INSERT INTO notifications (id,user_id,type,title,body,link) VALUES (?,?,?,?,?,?)');
    for (const u of users) {
      ins.run(newId('n_'), u.id, 'announcement', parsed.data.title, parsed.data.body.slice(0, 120), '/announcements');
    }
  }
  res.json(ok({ id }));
});

// Notifications
router.get('/notifications/mine', authRequired, (req: AuthRequest, res) => {
  const items = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user!.sub);
  const unread = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND read=0').get(req.user!.sub) as any).c;
  res.json(ok({ items, unread }));
});

router.post('/notifications/:id/read', authRequired, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user!.sub);
  res.json(ok({ read: true }));
});

router.post('/notifications/read-all', authRequired, (req: AuthRequest, res) => {
  db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(req.user!.sub);
  res.json(ok({ read: true }));
});

export default router;
