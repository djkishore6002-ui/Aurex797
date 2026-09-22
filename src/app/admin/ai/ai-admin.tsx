'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, ErrorBanner, ProgressBar } from '@/components/ui';

interface Settings {
  provider: string;
  model_default: string;
  model_strong: string;
  system_prompt: string;
  response_style: string;
  supported_languages: string;
  byoai_enabled: boolean;
  daily_request_limit: number;
  per_user_daily_limit: number;
  general_questions_allowed: boolean;
}

export function AiAdmin({
  settings,
  knowledge,
  usage,
  hasPlatformKey,
  recent,
  staleDocs,
}: {
  settings: Settings;
  knowledge: { docs: number; stale: number; chunks: number; lastIndexed: string };
  usage: { today_requests: number; today_in: number; today_out: number; all_requests: number; all_tokens: number };
  hasPlatformKey: boolean;
  recent: { user: string; purpose: string; provider: string; model: string; tokens: string; at: string }[];
  staleDocs: { id: number; type: string; source_id: number; title: string; updated: string }[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy('save');
    setError(null);
    setStatus(null);
    try {
      const res = await fetch('/api/admin/ai', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_default: form.model_default,
          model_strong: form.model_strong || null,
          system_prompt: form.system_prompt,
          response_style: form.response_style,
          supported_languages: JSON.parse(form.supported_languages || '[]'),
          byoai_enabled: form.byoai_enabled ? 1 : 0,
          daily_request_limit: Number(form.daily_request_limit),
          per_user_daily_limit: Number(form.per_user_daily_limit),
          general_questions_allowed: form.general_questions_allowed ? 1 : 0,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Save failed');
      setStatus('AI settings updated ✓ (audited)');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(null);
    }
  };

  const reindex = async (action: string, source_type?: string, source_id?: number) => {
    setBusy('reindex');
    setError(null);
    setStatus(action === 'reindex_all' ? 'REINDEXING… (content → chunks → vectors → knowledge)' : 'Indexing…');
    try {
      const res = await fetch('/api/admin/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, source_type, source_id }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Reindex failed');
      setStatus(d.status ?? `Indexed: ${d.title ?? ''} ✓`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reindex failed');
      setStatus(null);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8">
      {status && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900" role="status">
          {status}
        </div>
      )}
      {error && <ErrorBanner error={error} />}

      {/* Provider */}
      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-ink-950">Provider</h2>
          <Badge tone={hasPlatformKey ? 'success' : 'warning'}>{hasPlatformKey ? 'OpenRouter platform key: configured' : 'No platform key — local retrieval tutor active'}</Badge>
          <Badge tone="info">{form.provider}</Badge>
        </div>
        <p className="text-sm text-ink-500">
          The platform key lives in server environment variables only — it is never sent to browsers. Without it, the tutor runs the built-in local retrieval engine (answers strictly from platform content, no fabrication).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="label">Default model (OpenRouter id)</span>
            <input className="input font-mono text-xs" value={form.model_default} onChange={(e) => setForm((f) => ({ ...f, model_default: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="label">Strong model (complex tasks)</span>
            <input className="input font-mono text-xs" placeholder="optional" value={form.model_strong} onChange={(e) => setForm((f) => ({ ...f, model_strong: e.target.value }))} />
          </label>
          <label className="text-sm">
            <span className="label">Response style</span>
            <select className="input" value={form.response_style} onChange={(e) => setForm((f) => ({ ...f, response_style: e.target.value }))}>
              <option value="encouraging">Encouraging</option>
              <option value="concise">Concise</option>
              <option value="precise">Precise</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="label">Supported explanation languages (JSON)</span>
            <input className="input font-mono text-xs" value={form.supported_languages} onChange={(e) => setForm((f) => ({ ...f, supported_languages: e.target.value }))} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="label">System prompt</span>
          <textarea className="input min-h-[110px] font-mono text-xs" value={form.system_prompt} onChange={(e) => setForm((f) => ({ ...f, system_prompt: e.target.value }))} />
        </label>
        <div className="flex flex-wrap items-center gap-5 text-sm text-ink-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.byoai_enabled} onChange={(e) => setForm((f) => ({ ...f, byoai_enabled: e.target.checked }))} />
            Allow BYOAI (user OpenRouter keys)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.general_questions_allowed} onChange={(e) => setForm((f) => ({ ...f, general_questions_allowed: e.target.checked }))} />
            Allow general Tamil questions
          </label>
          <label className="flex items-center gap-2">
            Daily platform requests:
            <input className="input w-24 !py-1" type="number" min={1} value={form.daily_request_limit} onChange={(e) => setForm((f) => ({ ...f, daily_request_limit: Number(e.target.value) }))} />
          </label>
          <label className="flex items-center gap-2">
            Per-user daily:
            <input className="input w-24 !py-1" type="number" min={1} value={form.per_user_daily_limit} onChange={(e) => setForm((f) => ({ ...f, per_user_daily_limit: Number(e.target.value) }))} />
          </label>
        </div>
        <div className="flex justify-end">
          <button onClick={save} disabled={busy === 'save'} className="btn-primary">{busy === 'save' ? 'Saving…' : 'Save AI settings'}</button>
        </div>
      </section>

      {/* Knowledge */}
      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-bold text-ink-950">Knowledge (RAG index)</h2>
          <Badge tone="success">{knowledge.docs} documents</Badge>
          <Badge>{knowledge.chunks} chunks</Badge>
          {knowledge.stale > 0 ? <Badge tone="warning">{knowledge.stale} stale</Badge> : <Badge tone="success">✓ Up to date</Badge>}
        </div>
        <p className="text-sm text-ink-500">
          Last indexed: <b>{knowledge.lastIndexed}</b>. CMS edits automatically re-index affected content. Manual reindex:
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => reindex('reindex_all')} disabled={busy === 'reindex'} className="btn-primary">
            {busy === 'reindex' ? 'REINDEXING…' : 'Reindex everything'}
          </button>
          {staleDocs.slice(0, 3).map((d) => (
            <button key={d.id} onClick={() => reindex('reindex_source', d.type, d.source_id)} disabled={busy === 'reindex'} className="btn-secondary !py-2 text-xs">
              Reindex: {d.title.slice(0, 40)}
            </button>
          ))}
        </div>
        {staleDocs.length > 0 && (
          <div className="rounded-xl bg-marigold-50 px-4 py-3 text-xs text-marigold-900">
            <b>Stale content</b> (content changed, embeddings pending):
            <ul className="mt-1.5 space-y-1">
              {staleDocs.map((d) => (
                <li key={d.id}>
                  {d.title} <span className="text-marigold-700">({d.type} #{d.source_id})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Usage */}
      <section className="card space-y-4 p-6">
        <h2 className="font-bold text-ink-950">Usage & cost</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-400">Today requests</p><p className="text-xl font-bold">{usage.today_requests}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-400">Today tokens in</p><p className="text-xl font-bold">{usage.today_in}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-400">Today tokens out</p><p className="text-xl font-bold">{usage.today_out}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-400">All-time requests</p><p className="text-xl font-bold">{usage.all_requests}</p></div>
          <div className="rounded-xl bg-ink-50 p-4"><p className="text-xs text-ink-400">All-time tokens</p><p className="text-xl font-bold">{usage.all_tokens}</p></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-400">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Purpose</th>
                <th className="py-2 pr-3">Provider/model</th>
                <th className="py-2">Tokens (in→out)</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-b border-ink-50 last:border-b-0">
                  <td className="py-2 pr-3 text-xs text-ink-400">{r.at} UTC</td>
                  <td className="py-2 pr-3">{r.user}</td>
                  <td className="py-2 pr-3"><Badge>{r.purpose}</Badge></td>
                  <td className="py-2 pr-3 font-mono text-xs">{r.provider}{r.model ? ` · ${r.model}` : ''}</td>
                  <td className="py-2 font-mono text-xs">{r.tokens}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-sm text-ink-400">No AI usage yet.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-400">
          Cost estimates are order-of-magnitude (≈ $0.15/$0.60 per 1M in/out tokens). Caching + per-user + global daily limits protect spend.
        </p>
      </section>
    </div>
  );
}
