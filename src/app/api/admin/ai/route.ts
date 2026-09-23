import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { json, readJson, route, rateLimit, clientIp } from '@/lib/api';
import { audit } from '@/lib/audit';
import { getProviderSettings, updateProviderSettings, usageToday } from '@/lib/ai/gateway';
import { knowledgeStatus, reindexAll, markStale } from '@/lib/ai/knowledge';

export async function GET() {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const settings = getProviderSettings(db);
    const knowledge = knowledgeStatus(db);
    const today = usageToday(db);
    const total = db.prepare('SELECT COUNT(*) c FROM ai_usage').get() as unknown as { c: number };
    const tokens = db.prepare('SELECT COALESCE(SUM(tokens_in),0) tin, COALESCE(SUM(tokens_out),0) tout, COALESCE(SUM(cost_estimate_micro_usd),0) cost FROM ai_usage').get() as unknown as { tin: number; tout: number; cost: number };
    const recent = db
      .prepare('SELECT user_id, provider, model, purpose, tokens_in, tokens_out, cost_estimate_micro_usd, created_at FROM ai_usage ORDER BY id DESC LIMIT 30')
      .all();
    const byUser = db
      .prepare('SELECT u.name, u.email, COUNT(*) requests, SUM(tokens_in + tokens_out) tokens FROM ai_usage a JOIN users u ON u.id = a.user_id GROUP BY u.id ORDER BY requests DESC LIMIT 10')
      .all();
    const staleDocs = db.prepare("SELECT id, source_type, source_id, title, updated_at FROM ai_knowledge_documents WHERE status = 'stale' ORDER BY updated_at DESC LIMIT 20").all();
    const hasPlatformKey = !!process.env.OPENROUTER_API_KEY;
    return json({ settings, knowledge, today, total: total.c, tokens, recent, byUser, staleDocs, hasPlatformKey });
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as Record<string, unknown>;
    const db = getDb();
    const before = getProviderSettings(db);
    const patch: Record<string, unknown> = {};
    const allowed: [string, (v: unknown) => number | string][] = [
      ['model_default', (v) => String(v).slice(0, 120)],
      ['model_strong', (v) => String(v).slice(0, 120) || ''],
      ['system_prompt', (v) => String(v).slice(0, 6000)],
      ['response_style', (v) => (['encouraging', 'concise', 'precise'].includes(String(v)) ? String(v) : 'encouraging')],
      ['supported_languages', (v) => JSON.stringify(Array.isArray(v) ? v.slice(0, 20) : [])],
      ['byoai_enabled', (v) => (v ? 1 : 0)],
      ['daily_request_limit', (v) => Math.min(100000, Math.max(1, Number(v) || 0))],
      ['per_user_daily_limit', (v) => Math.min(10000, Math.max(1, Number(v) || 0))],
      ['general_questions_allowed', (v) => (v ? 1 : 0)],
    ];
    for (const [key, parse] of allowed) {
      if (body[key] !== undefined) patch[key] = parse(body[key]);
    }
    updateProviderSettings(db, patch as never);
    audit(admin, 'AI_SETTINGS_CHANGED', { entity: 'ai_provider_settings', next: patch, prev: { model_default: before.model_default, byoai_enabled: before.byoai_enabled } });
    return json({ ok: true, settings: getProviderSettings(db) });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { action: 'reindex_all' | 'reindex_source' | 'mark_stale'; source_type?: string; source_id?: number };
    const ip = clientIp(req);
    const rl = rateLimit(`reindex:${ip}`, 6, 60_000);
    if (!rl.ok) throw new Error('Reindex in progress — wait a moment');
    const db = getDb();
    if (body.action === 'reindex_all') {
      const stats = reindexAll(db);
      audit(admin, 'AI_REINDEXED_ALL', { next: stats });
      return json({ ok: true, ...stats, status: 'AI KNOWLEDGE UPDATED' });
    }
    if (body.action === 'reindex_source') {
      const { reindexSingle } = await import('@/lib/ai/reindex');
      const stats = reindexSingle(db, String(body.source_type), Number(body.source_id));
      audit(admin, 'AI_REINDEXED_SOURCE', { next: { ...body, ...stats } });
      return json({ ok: true, ...stats });
    }
    if (body.action === 'mark_stale') {
      markStale(db, String(body.source_type ?? 'lesson'), Number(body.source_id ?? 0));
      audit(admin, 'AI_MARKED_STALE', { next: { ...body } });
      return json({ ok: true });
    }
    throw new Error('Unknown action');
  });
}
