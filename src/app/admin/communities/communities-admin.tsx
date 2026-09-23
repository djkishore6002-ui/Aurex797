'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorBanner } from '@/components/ui';

interface C { id: number; name: string; description: string | null; members: number; posts: number; is_private: number }
interface HiddenPost { id: number; title: string; community: string; reason: string | null; author: string; updated: string }
interface Report { id: number; target_type: string; target_id: number; reason: string; reporter: string; status: string; created: string }

export function CommunitiesAdmin({ communities, hiddenPosts, reports }: { communities: C[]; hiddenPosts: HiddenPost[]; reports: Report[] }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();
  const patch = async (payload: unknown) => {
    try {
      const res = await fetch('/api/admin/communities', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  };

  return (
    <div className="space-y-8">
      {error && <ErrorBanner error={error} />}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-ink-900">Groups</h2>
          <button onClick={() => setShowNew(true)} className="btn-secondary !py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Create community</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {communities.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-center gap-2">
                <p className="font-bold">{c.name}</p>
                {c.is_private ? <Badge>private</Badge> : <Badge tone="success">open</Badge>}
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-ink-500">{c.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-ink-400">{c.members} members · {c.posts} posts</span>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete community “${c.name}”?`)) return;
                      try {
                        await fetch('/api/admin/communities', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community_id: c.id, action: 'delete' }) });
                        refresh();
                      } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
                    }}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Hidden content ({hiddenPosts.length})</h2>
        {hiddenPosts.length === 0 ? (
          <p className="card p-5 text-sm text-ink-500">Nothing is currently hidden.</p>
        ) : (
          <div className="card divide-y divide-ink-50">
            {hiddenPosts.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-ink-400">{p.community} · by {p.author} · {p.updated}{p.reason ? ` · “${p.reason}”` : ''}</p>
                </div>
                <button onClick={() => patch({ target_type: 'post', target_id: p.id, action: 'unhide' })} className="btn-secondary !py-1 text-xs">Unhide</button>
                <button
                  onClick={async () => {
                    if (!confirm('Permanently delete this post?')) return;
                    await patch({ target_type: 'post', target_id: p.id, action: 'delete' });
                  }}
                  className="btn-ghost !py-1 text-xs text-red-600"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-bold text-ink-900">Reports ({reports.length})</h2>
        {reports.length === 0 ? (
          <p className="card p-5 text-sm text-ink-500">No reports. 🙌</p>
        ) : (
          <div className="card divide-y divide-ink-50">
            {reports.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Badge tone={r.status === 'open' ? 'warning' : 'default'}>{r.status}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <b>{r.target_type}</b> #{r.target_id}: <span className="text-ink-700">{r.reason}</span>
                  </p>
                  <p className="text-xs text-ink-400">Reported by {r.reporter} · {r.created}</p>
                </div>
                {r.status === 'open' && <button onClick={() => patch({ target_type: r.target_type, target_id: r.target_id, action: 'hide', reason: 'reported by learner' }).then(() => refresh())} className="btn-secondary !py-1 text-xs">Hide target</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {showNew && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch('/api/admin/communities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
                if (!res.ok) throw new Error((await res.json()).error ?? 'Failed');
                setShowNew(false);
                setForm({ name: '', description: '' });
                refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed');
              }
            }}
          >
            <h3 className="font-bold">Create community</h3>
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Name" required minLength={3} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <textarea className="input min-h-[70px]" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
