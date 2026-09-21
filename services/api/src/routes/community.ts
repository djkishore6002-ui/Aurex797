import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest, requireRole } from '../middleware/auth';
import { newId, ok } from '../utils/helpers';

const router = Router();

router.get('/', (req, res) => {
  const items = db.prepare(`SELECT c.*, u.name as creator_name,
      (SELECT COUNT(*) FROM community_members cm WHERE cm.community_id=c.id) as members
    FROM communities c JOIN users u ON u.id=c.created_by ORDER BY c.created_at DESC LIMIT 50`).all();
  res.json(ok({ items }));
});

router.post('/', authRequired, requireRole('admin','organizer'), (req: AuthRequest, res) => {
  const { name, description, course_id } = req.body;
  if (!name) return res.status(400).json({ success: false, error: { message: 'name required' } });
  const id = newId('cm_');
  db.prepare('INSERT INTO communities (id,name,description,course_id,created_by) VALUES (?,?,?,?,?)')
    .run(id, name, description || null, course_id || null, req.user!.sub);
  db.prepare('INSERT INTO community_members (community_id,user_id,role) VALUES (?,?,?)').run(id, req.user!.sub, 'moderator');
  res.json(ok({ id }));
});

router.post('/:id/join', authRequired, (req: AuthRequest, res) => {
  const c = db.prepare('SELECT id FROM communities WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  try {
    db.prepare('INSERT INTO community_members (community_id,user_id,role) VALUES (?,?,?)').run(req.params.id, req.user!.sub, 'member');
  } catch {}
  res.json(ok({ joined: true }));
});

router.get('/:id/posts', (req, res) => {
  const posts = db.prepare(`SELECT p.*, u.name as author_name,
      (SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) as comments
    FROM posts p JOIN users u ON u.id=p.author_id WHERE p.community_id=? ORDER BY p.created_at DESC LIMIT 100`).all(req.params.id);
  res.json(ok({ posts }));
});

const postSchema = z.object({ title: z.string().min(1), body: z.string().min(1) });
router.post('/:id/posts', authRequired, (req: AuthRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const member = db.prepare('SELECT 1 FROM community_members WHERE community_id=? AND user_id=?').get(req.params.id, req.user!.sub);
  if (!member) return res.status(403).json({ success: false, error: { code: 'JOIN_REQUIRED', message: 'Join community first' } });
  const id = newId('p_');
  db.prepare('INSERT INTO posts (id,community_id,author_id,title,body) VALUES (?,?,?,?,?)')
    .run(id, req.params.id, req.user!.sub, parsed.data.title, parsed.data.body);
  res.json(ok({ id }));
});

router.get('/posts/:pid/comments', (req, res) => {
  const items = db.prepare('SELECT c.*, u.name as author_name FROM comments c JOIN users u ON u.id=c.author_id WHERE c.post_id=? ORDER BY c.created_at ASC').all(req.params.pid);
  res.json(ok({ items }));
});

router.post('/posts/:pid/comments', authRequired, (req: AuthRequest, res) => {
  const { body } = req.body;
  if (!body) return res.status(400).json({ success: false, error: { message: 'body required' } });
  const post = db.prepare('SELECT community_id FROM posts WHERE id=?').get(req.params.pid) as any;
  if (!post) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const id = newId('co_');
  db.prepare('INSERT INTO comments (id,post_id,author_id,body) VALUES (?,?,?,?)').run(id, req.params.pid, req.user!.sub, body);
  res.json(ok({ id }));
});

export default router;
