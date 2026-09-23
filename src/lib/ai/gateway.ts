import crypto from 'node:crypto';
import type { DB } from '@/db';
import { getDb } from '@/db';
import { ApiError } from '@/lib/api';
import type { SessionUser } from '@/lib/auth';
import { decryptSecret } from '@/lib/crypto';
import { blocksToText, retrieve } from './knowledge';
import { LocalProvider } from './local';
import { OpenRouterProvider } from './openrouter';
import { estimateCostMicroUsd, estimateTokens, type AIRequest, type AIResponse, type AIProviderOptions, type RetrievedChunk } from './provider';

export interface ProviderSettings {
  id: number;
  provider: string;
  model_default: string;
  model_strong: string | null;
  system_prompt: string | null;
  response_style: string;
  supported_languages: string;
  byoai_enabled: number;
  daily_request_limit: number;
  per_user_daily_limit: number;
  general_questions_allowed: number;
  updated_at: string;
}

export const DEFAULT_SYSTEM_PROMPT = `You are "Tamil Tutor", the AI assistant of Solai — a Tamil language learning platform.
You help absolute beginners, intermediate and advanced learners, foreign learners and the Tamil diaspora learn Tamil.
Tamil is the first language here: always lead with Tamil script, then give transliteration and the English meaning.
Use examples and mini practice sentences. For foreign learners, you may add a short note in their native language, but keep Tamil script and English visible.
Be encouraging, concise and correct.`;

export function getProviderSettings(db: DB = getDb()): ProviderSettings {
  let row = db.prepare('SELECT * FROM ai_provider_settings WHERE id = 1').get() as unknown as unknown as ProviderSettings | undefined;
  if (!row) {
    db.prepare('INSERT INTO ai_provider_settings (id, system_prompt) VALUES (1, ?)').run(DEFAULT_SYSTEM_PROMPT);
    row = db.prepare('SELECT * FROM ai_provider_settings WHERE id = 1').get() as unknown as unknown as ProviderSettings;
  }
  return row;
}

export function updateProviderSettings(db: DB, patch: Partial<ProviderSettings>): ProviderSettings {
  const fields = ['provider', 'model_default', 'model_strong', 'system_prompt', 'response_style', 'supported_languages', 'byoai_enabled', 'daily_request_limit', 'per_user_daily_limit', 'general_questions_allowed'] as const;
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
  for (const f of fields) {
    if (patch[f] !== undefined) {
      sets.push(`${f} = ?`);
      params.push(patch[f]);
    }
  }
  if (sets.length) {
    sets.push(`updated_at = datetime('now')`);
    db.prepare(`UPDATE ai_provider_settings SET ${sets.join(', ')} WHERE id = 1`).run(...params);
  }
  return getProviderSettings(db);
}

/* ── Response cache (24h, keyed by question + context + provider) ── */
const CACHE_TTL_MS = 24 * 3600_000;
const cache = new Map<string, { at: number; response: AIResponse }>();
function cacheKey(req: AIRequest, model: string): string {
  const ctx = req.context ? `${req.context.type}:${req.context.id ?? req.context.label}` : 'none';
  return crypto.createHash('sha256').update(`${model}|${ctx}|${req.question.trim().toLowerCase()}`).digest('hex');
}

/* ── Usage counters & limits ── */
export function usageToday(db: DB): { requests: number; tokensIn: number; tokensOut: number; costMicroUsd: number } {
  const row = db.prepare("SELECT COUNT(*) AS requests, SUM(tokens_in) AS tokensIn, SUM(tokens_out) AS tokensOut, SUM(cost_estimate_micro_usd) AS cost FROM ai_usage WHERE date(created_at) = date('now')").get() as unknown as { requests: number; tokensIn: number | null; tokensOut: number | null; cost: number | null };
  return { requests: row.requests ?? 0, tokensIn: row.tokensIn ?? 0, tokensOut: row.tokensOut ?? 0, costMicroUsd: row.cost ?? 0 };
}

export function userUsageToday(db: DB, userId: number): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM ai_usage WHERE user_id = ? AND date(created_at) = date('now')").get(userId) as unknown as { c: number };
  return row.c;
}

function logUsage(db: DB, userId: number | null, resp: AIResponse, purpose: string): void {
  db.prepare('INSERT INTO ai_usage (user_id, provider, model, purpose, tokens_in, tokens_out, cost_estimate_micro_usd) VALUES (?,?,?,?,?,?,?)').run(
    userId,
    resp.provider,
    resp.model,
    purpose,
    resp.tokensIn,
    resp.tokensOut,
    estimateCostMicroUsd(resp.tokensIn, resp.tokensOut)
  );
}

/* ── BYOAI keys ── */
export function getUserApiKey(db: DB, userId: number): { key: string; hint: string } | null {
  const row = db.prepare('SELECT encrypted_key, key_hint FROM user_ai_keys WHERE user_id = ?').get(userId) as unknown as { encrypted_key: string; key_hint: string } | undefined;
  if (!row) return null;
  const key = decryptSecret(row.encrypted_key);
  return key ? { key, hint: row.key_hint } : null;
}

export function setUserApiKey(db: DB, userId: number, apiKey: string): void {
  const hint = `${apiKey.slice(0, 3)}••••••••${apiKey.slice(-4)}`;
  db.prepare(
    `INSERT INTO user_ai_keys (user_id, encrypted_key, key_hint) VALUES (?,?,?)
     ON CONFLICT(user_id) DO UPDATE SET encrypted_key = excluded.encrypted_key, key_hint = excluded.key_hint, updated_at = datetime('now')`
  ).run(userId, (() => {
    const { encryptSecret } = require('@/lib/crypto') as unknown as typeof import('@/lib/crypto');
    return encryptSecret(apiKey);
  })(), hint);
}

export function deleteUserApiKey(db: DB, userId: number): void {
  db.prepare('DELETE FROM user_ai_keys WHERE user_id = ?').run(userId);
}

/* ── Conversation persistence ── */
export function getOrCreateConversation(db: DB, userId: number, contextType: string, contextId: number | null, title: string): number {
  const existing = db
    .prepare('SELECT id FROM ai_conversations WHERE user_id = ? AND context_type = ? AND context_id IS ? ORDER BY id DESC LIMIT 1')
    .get(userId, contextType, contextId) as unknown as { id: number } | undefined;
  if (existing) return existing.id;
  const res = db.prepare('INSERT INTO ai_conversations (user_id, context_type, context_id, title) VALUES (?,?,?,?)').run(userId, contextType, contextId, title);
  return Number(res.lastInsertRowid);
}

export function saveMessages(db: DB, conversationId: number, question: string, resp: AIResponse): void {
  db.prepare('INSERT INTO ai_messages (conversation_id, role, content, tokens_in, tokens_out, model, provider) VALUES (?,?,?,?,?,?,?)').run(
    conversationId,
    'user',
    question,
    0,
    0,
    resp.model,
    resp.provider
  );
  db.prepare('INSERT INTO ai_messages (conversation_id, role, content, tokens_in, tokens_out, model, provider) VALUES (?,?,?,?,?,?,?)').run(
    conversationId,
    'assistant',
    resp.answer,
    resp.tokensIn,
    resp.tokensOut,
    resp.model,
    resp.provider
  );
}

/* ── Page context builder (context-aware AI) ── */
export function buildPageContext(db: DB, context: NonNullable<AIRequest['context']>): { label: string; text: string } | null {
  if (context.type === 'lesson' && context.id) {
    const lesson = db
      .prepare(
        `SELECT l.title, l.summary, l.content_json, l.transcript_text, m.title AS module_title, c.title AS course_title
         FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.id = ?`
      )
      .get(context.id) as unknown as { title: string; summary: string; content_json: string; transcript_text: string; module_title: string; course_title: string } | undefined;
    if (!lesson) return null;
    const blocks = safeJson(lesson.content_json);
    const vocab = (db.prepare('SELECT tamil, transliteration, meaning FROM vocabulary WHERE lesson_id = ?').all(context.id) as unknown as { tamil: string; transliteration: string; meaning: string }[])
      .map((v) => `${v.tamil} (${v.transliteration}) = ${v.meaning}`)
      .join('; ');
    return {
      label: `${lesson.course_title} → ${lesson.module_title} → ${lesson.title}`,
      text: [lesson.summary, blocksToText(blocks), vocab, lesson.transcript_text ?? ''].filter(Boolean).join('\n'),
    };
  }
  if (context.type === 'workshop' && context.id) {
    const w = db.prepare('SELECT title, description FROM workshops WHERE id = ?').get(context.id) as unknown as { title: string; description: string } | undefined;
    if (!w) return null;
    return { label: `Workshop: ${w.title}`, text: w.description ?? '' };
  }
  if (context.type === 'vocabulary' && context.text) {
    return { label: context.label, text: context.text };
  }
  if (context.text) return { label: context.label, text: context.text };
  return null;
}

/* ── The gateway: resolves provider, enforces limits, logs usage ── */
export async function aiChat(user: SessionUser | null, req: AIRequest, db: DB = getDb()): Promise<AIResponse> {
  const settings = getProviderSettings(db);

  // Rate limits
  if (user) {
    const userCount = userUsageToday(db, user.id);
    if (userCount >= settings.per_user_daily_limit) {
      throw new ApiError(429, `You have reached your daily limit of ${settings.per_user_daily_limit} AI questions. Try again tomorrow.`);
    }
  }
  const today = usageToday(db);
  if (today.requests >= settings.daily_request_limit) {
    throw new ApiError(429, 'The AI tutor is at capacity for today. Please try again tomorrow.');
  }

  // Resolve provider: BYOAI → platform key → local
  let provider: 'openrouter' | 'local' = 'local';
  let model = settings.model_default;
  let apiKey: string | null = null;

  if (settings.byoai_enabled && user) {
    const userKey = getUserApiKey(db, user.id);
    if (userKey) {
      apiKey = userKey.key;
      provider = 'openrouter';
    }
  }
  if (!apiKey && process.env.OPENROUTER_API_KEY) {
    apiKey = process.env.OPENROUTER_API_KEY;
    provider = 'openrouter';
    model = process.env.OPENROUTER_MODEL || settings.model_default;
  }

  // Cache lookup (only for tutor purpose; skip preliminary answers)
  const key = cacheKey(req, provider === 'openrouter' ? model : 'local');
  if (req.purpose === 'tutor' || !req.purpose) {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return { ...hit.response, cached: true };
    }
  }

  // Retrieval (RAG) — prefer current page context scope, then global
  const knowledge: RetrievedChunk[] = [];
  if (req.context?.type === 'lesson' && req.context.id) {
    knowledge.push(...retrieve(db, req.question, 3, (c) => c.source_type === 'lesson' && c.source_id === req.context!.id));
  }
  knowledge.push(...retrieve(db, req.question, 5).filter((g) => !knowledge.some((k) => k.content === g.content)));
  const topKnowledge = knowledge.slice(0, 5);

  const pageCtx = req.context ? buildPageContext(db, req.context) : null;
  const fullReq: AIRequest = { ...req, context: pageCtx ? { ...req.context!, label: pageCtx.label, text: pageCtx.text } : req.context };

  const opts: AIProviderOptions = {
    systemPrompt: settings.system_prompt || DEFAULT_SYSTEM_PROMPT,
    temperature: settings.response_style === 'precise' ? 0.3 : 0.7,
    maxTokens: 900,
    model,
    knowledge: topKnowledge,
    language: req.language,
  };

  let response: AIResponse;
  if (provider === 'openrouter' && apiKey) {
    try {
      response = await new OpenRouterProvider(apiKey).complete(fullReq, opts);
    } catch (e) {
      console.warn('[ai] OpenRouter failed, falling back to local provider:', e instanceof Error ? e.message : e);
      response = await new LocalProvider(db).complete(fullReq, opts);
    }
  } else {
    response = await new LocalProvider(db).complete(fullReq, opts);
  }

  logUsage(db, user?.id ?? null, response, req.purpose ?? 'tutor');
  if (req.purpose === 'tutor' || !req.purpose) {
    cache.set(key, { at: Date.now(), response });
  }
  return response;
}

/** Preliminary AI answer for the Ask-Teacher flow (stored, teacher can edit/reject). */
export async function preliminaryAnswer(user: SessionUser, question: string, context: AIRequest['context'] | null, db: DB = getDb()): Promise<string> {
  const resp = await aiChat(user, { question, history: [], context: context ?? undefined, purpose: 'question_prelim' }, db);
  return resp.answer;
}

function safeJson(s: string | null): unknown {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}
