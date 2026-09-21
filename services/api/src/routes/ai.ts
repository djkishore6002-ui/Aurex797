import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { authRequired, AuthRequest } from '../middleware/auth';
import { generate, testConnection } from '../ai/gateway';
import { newId, ok, encryptKey, decryptKey } from '../utils/helpers';
import { config } from '../config';

const router = Router();

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  context: z.object({
    course_id: z.string().optional(),
    lesson_id: z.string().optional(),
    workshop_id: z.string().optional(),
    level: z.string().optional(),
    native_language: z.string().optional(),
  }).optional(),
});

router.post('/chat', authRequired, async (req: AuthRequest, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });

  // Rate limit: count messages today
  const today = new Date().toISOString().slice(0, 10);
  const count = (db.prepare("SELECT COUNT(*) as c FROM ai_conversations WHERE user_id=? AND role='user' AND substr(created_at,1,10)=?")
    .get(req.user!.sub, today) as any).c;
  if (count >= config.aiDailyLimit) {
    return res.status(429).json({ success: false, error: { code: 'RATE_LIMIT', message: 'Daily AI limit reached; try BYOAI in settings.' } });
  }

  const profile = db.prepare('SELECT level, native_language FROM profiles WHERE user_id=?').get(req.user!.sub) as any;
  const context = { ...(parsed.data.context || {}), level: profile?.level, native_language: profile?.native_language };
  const histRows = db.prepare("SELECT role,content FROM ai_conversations WHERE user_id=? ORDER BY created_at DESC LIMIT 20").all(req.user!.sub) as any[];
  const history = histRows.slice().reverse();

  db.prepare('INSERT INTO ai_conversations (id,user_id,role,content,context) VALUES (?,?,?,?,?)')
    .run(newId('ai_'), req.user!.sub, 'user', parsed.data.message, JSON.stringify(context));

  try {
    const result = await generate({
      userId: req.user!.sub,
      userMessage: parsed.data.message,
      context,
      history,
    });
    db.prepare('INSERT INTO ai_conversations (id,user_id,role,content,context) VALUES (?,?,?,?,?)')
      .run(newId('ai_'), req.user!.sub, 'assistant', result.reply, JSON.stringify({ model: result.model, provider: result.provider }));
    res.json(ok({ reply: result.reply, provider: result.provider, model: result.model, remaining: config.aiDailyLimit - count - 1 }));
  } catch (e) {
    res.status(500).json({ success: false, error: { code: 'AI_ERROR', message: (e as Error).message } });
  }
});

router.get('/history', authRequired, (req: AuthRequest, res) => {
  const items = db.prepare('SELECT id,role,content,created_at,context FROM ai_conversations WHERE user_id=? ORDER BY created_at ASC LIMIT 200').all(req.user!.sub);
  res.json(ok({ items }));
});

// AI settings
router.get('/settings', authRequired, (req: AuthRequest, res) => {
  let s = db.prepare('SELECT * FROM ai_provider_settings WHERE user_id=?').get(req.user!.sub) as any;
  if (!s) {
    db.prepare('INSERT INTO ai_provider_settings (user_id,mode,provider) VALUES (?,?,?)').run(req.user!.sub, 'platform', config.openRouterKey ? 'openrouter' : 'mock');
    s = db.prepare('SELECT * FROM ai_provider_settings WHERE user_id=?').get(req.user!.sub);
  }
  res.json(ok({
    mode: s.mode,
    provider: s.provider,
    has_key: !!s.encrypted_key,
    model: s.model,
    platform_provider: config.openRouterKey ? 'openrouter' : 'mock',
    platform_model: config.aiPlatformModel,
    daily_limit: config.aiDailyLimit,
  }));
});

const settingsSchema = z.object({
  mode: z.enum(['platform', 'byoai']),
  api_key: z.string().optional(),
  model: z.string().optional(),
});
router.post('/settings', authRequired, (req: AuthRequest, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const encKey = parsed.data.api_key ? encryptKey(parsed.data.api_key) : null;
  const existing = db.prepare('SELECT encrypted_key FROM ai_provider_settings WHERE user_id=?').get(req.user!.sub) as any;
  const finalKey = encKey ?? existing?.encrypted_key ?? null;
  db.prepare(`INSERT INTO ai_provider_settings (user_id,mode,provider,encrypted_key,model,updated_at)
              VALUES (?,?,?,?,?,datetime('now'))
              ON CONFLICT(user_id) DO UPDATE SET mode=excluded.mode, provider=excluded.provider,
                encrypted_key=COALESCE(excluded.encrypted_key, ai_provider_settings.encrypted_key),
                model=excluded.model, updated_at=datetime('now')`).run(
    req.user!.sub, parsed.data.mode, 'openrouter', finalKey, parsed.data.model || null
  );
  res.json(ok({ saved: true }));
});

router.post('/test-connection', authRequired, async (req: AuthRequest, res) => {
  const { mode, api_key, model } = req.body;
  const key = mode === 'byoai' ? (api_key || (() => {
    const s = db.prepare('SELECT encrypted_key FROM ai_provider_settings WHERE user_id=?').get(req.user!.sub) as any;
    return s?.encrypted_key ? decryptKey(s.encrypted_key) : '';
  })()) : undefined;
  const result = await testConnection(mode, key, model);
  res.json(ok(result));
});

// Generate quiz for lesson
router.post('/generate-quiz/:lessonId', authRequired, async (req: AuthRequest, res) => {
  const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.lessonId) as any;
  if (!lesson) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
  const prompt = `Generate 3 multiple-choice questions in English (with Tamil script where appropriate) about the Tamil lesson "${lesson.title}". Respond ONLY in JSON: {"questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"..."}]}`;
  const result = await generate({ userId: req.user!.sub, userMessage: prompt, context: { lesson_id: lesson.id } });
  let questions: any[] = [];
  try {
    const jsonStr = result.reply.match(/\{[\s\S]*\}/)?.[0];
    if (jsonStr) questions = JSON.parse(jsonStr).questions || [];
  } catch {}
  if (!questions.length) {
    questions = [
      { question: `What does "${lesson.title}" relate to?`, options: ['Travel', 'Food', 'This lesson', 'Math'], correct_index: 2, explanation: 'This quiz is tied to the lesson content.' },
    ];
  }
  res.json(ok({ questions, provider: result.provider }));
});

export default router;
