import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { hashPassword, verifyPassword, signToken } from '../utils/auth';
import { newId, ok, fail } from '../utils/helpers';
import { authRequired, AuthRequest } from '../middleware/auth';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(100),
  role: z.enum(['learner', 'organizer']).optional().default('learner'),
});

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message ?? 'Invalid input'));
  const { email, password, name, role } = parsed.data;

  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email.toLowerCase());
  if (existing) return res.status(409).json(fail('EMAIL_EXISTS', 'Email already registered', 409).body);

  const id = newId('u_');
  const hash = await hashPassword(password);
  db.prepare('INSERT INTO users (id,email,password_hash,name,role) VALUES (?,?,?,?,?)').run(id, email.toLowerCase(), hash, name, role);
  db.prepare('INSERT INTO profiles (user_id, level) VALUES (?,?)').run(id, 'absolute_beginner');
  db.prepare('INSERT INTO ai_provider_settings (user_id, mode, provider) VALUES (?, \'platform\', ?)')
    .run(id, process.env.OPENROUTER_API_KEY ? 'openrouter' : 'mock');

  const token = signToken({ sub: id, role: role as any, name });
  res.json(ok({ token, user: { id, email: email.toLowerCase(), name, role } }));
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail('VALIDATION', 'Invalid input').body);
  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase()) as any;
  if (!user) return res.status(401).json(fail('INVALID', 'Invalid email or password', 401).body);
  if (user.banned) return res.status(403).json(fail('BANNED', 'Account suspended', 403).body);
  const good = await verifyPassword(password, user.password_hash);
  if (!good) return res.status(401).json(fail('INVALID', 'Invalid email or password', 401).body);
  const token = signToken({ sub: user.id, role: user.role, name: user.name });
  res.json(ok({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar_url: user.avatar_url } }));
});

router.get('/me', authRequired, (req: AuthRequest, res) => {
  const user = db.prepare('SELECT id,email,name,role,avatar_url,email_verified,created_at FROM users WHERE id=?').get(req.user!.sub) as any;
  const profile = db.prepare('SELECT native_language,learning_goal,level,xp,streak_days,daily_goal_minutes,bio FROM profiles WHERE user_id=?').get(req.user!.sub) as any;
  res.json(ok({ user, profile }));
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  native_language: z.enum(['en','hi','te','ml','kn','ta']).nullable().optional(),
  learning_goal: z.string().max(50).nullable().optional(),
  level: z.enum(['absolute_beginner','beginner','intermediate','advanced']).optional(),
  daily_goal_minutes: z.number().int().min(5).max(240).optional(),
});

router.patch('/me', authRequired, (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail('VALIDATION', parsed.error.issues[0]?.message).body);
  const { name, bio, ...rest } = parsed.data;
  if (name) db.prepare('UPDATE users SET name=?, updated_at=datetime(\'now\') WHERE id=?').run(name, req.user!.sub);
  const fields = Object.keys(rest);
  if (fields.length || bio !== undefined) {
    const sets: string[] = [];
    const vals: any[] = [];
    for (const f of fields) { sets.push(`${f}=?`); vals.push((rest as any)[f]); }
    if (bio !== undefined) { sets.push('bio=?'); vals.push(bio); }
    vals.push(req.user!.sub);
    db.prepare(`UPDATE profiles SET ${sets.join(',')} WHERE user_id=?`).run(...vals);
  }
  const user = db.prepare('SELECT id,email,name,role,avatar_url FROM users WHERE id=?').get(req.user!.sub);
  const profile = db.prepare('SELECT * FROM profiles WHERE user_id=?').get(req.user!.sub);
  res.json(ok({ user, profile }));
});

router.post('/logout', authRequired, (_req, res) => {
  // Stateless JWT; client drops token.
  res.json(ok({ message: 'Logged out' }));
});

export default router;
