import { getDb } from '@/db';
import { PageHead, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { getProviderSettings } from '@/lib/ai/gateway';
import { AiAdmin } from './ai-admin';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminAiPage() {
  const db = getDb();
  const settings = getProviderSettings(db);
  const knowledge = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM ai_knowledge_documents WHERE status='current') docs,
        (SELECT COUNT(*) FROM ai_knowledge_documents WHERE status='stale') stale,
        (SELECT COUNT(*) FROM ai_knowledge_chunks) chunks,
        (SELECT MAX(indexed_at) FROM ai_knowledge_documents) last_indexed`
    )
    .get() as unknown as { docs: number; stale: number; chunks: number; last_indexed: string | null };
  const usage = db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM ai_usage WHERE date(created_at)=date('now')) today_requests,
        (SELECT COALESCE(SUM(tokens_in),0) FROM ai_usage WHERE date(created_at)=date('now')) today_in,
        (SELECT COALESCE(SUM(tokens_out),0) FROM ai_usage WHERE date(created_at)=date('now')) today_out,
        (SELECT COUNT(*) FROM ai_usage) all_requests,
        (SELECT COALESCE(SUM(tokens_in+tokens_out),0) FROM ai_usage) all_tokens`
    )
    .get() as unknown as { today_requests: number; today_in: number; today_out: number; all_requests: number; all_tokens: number };
  const recent = db
    .prepare(
      `SELECT a.*, u.name AS user_name FROM ai_usage a LEFT JOIN users u ON u.id = a.user_id ORDER BY a.id DESC LIMIT 15`
    )
    .all() as unknown as Record<string, unknown>[];
  const staleDocs = db.prepare("SELECT id, source_type, source_id, title, updated_at FROM ai_knowledge_documents WHERE status='stale' LIMIT 15").all() as unknown as Record<string, unknown>[];

  return (
    <div>
      <PageHead title="AI Knowledge & Provider" subtitle="Provider, models, behaviour, limits, knowledge indexing and usage. Changes take effect immediately and are audited." />
      <AiAdmin
        settings={{
          provider: settings.provider,
          model_default: settings.model_default,
          model_strong: settings.model_strong ?? '',
          system_prompt: settings.system_prompt ?? '',
          response_style: settings.response_style,
          supported_languages: settings.supported_languages,
          byoai_enabled: settings.byoai_enabled === 1,
          daily_request_limit: settings.daily_request_limit,
          per_user_daily_limit: settings.per_user_daily_limit,
          general_questions_allowed: settings.general_questions_allowed === 1,
        }}
        knowledge={{ docs: knowledge.docs, stale: knowledge.stale, chunks: knowledge.chunks, lastIndexed: knowledge.last_indexed ? fmtDate(knowledge.last_indexed) : '—' }}
        usage={{ ...usage }}
        hasPlatformKey={!!process.env.OPENROUTER_API_KEY}
        recent={recent.map((r) => ({
          user: (r.user_name as string) ?? 'anonymous',
          purpose: r.purpose as string,
          provider: r.provider as string,
          model: (r.model as string | null) ?? '',
          tokens: `${r.tokens_in}→${r.tokens_out}`,
          at: (r.created_at as string).replace('T', ' ').slice(0, 16),
        }))}
        staleDocs={staleDocs.map((d) => ({ id: d.id as number, type: d.source_type as string, source_id: d.source_id as number, title: d.title as string, updated: d.updated_at as string }))}
      />
    </div>
  );
}
