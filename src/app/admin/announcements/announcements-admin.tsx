'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Badge, ErrorBanner } from '@/components/ui';

interface A {
  id: number;
  title: string;
  body: string;
  scope: string;
  target_id: number | null;
  target_label: string | null;
  is_published: number;
  created_by: string;
  created_at: string;
}

export function AnnouncementsAdmin({ announcements, targets }: { announcements: A[]; targets: { courses: { id: number; title: string }[]; workshops: { id: number; title: string }[]; communities: { id: number; name: string }[] } }) {
  const router = useRouter();
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', scope: 'global', target_id: '' });
  const [error, setError] = useState<string | null>(null);

  const act = async (a: A, payload: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/announcements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement_id: a.id, ...payload }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Action failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {error && <ErrorBanner error={error} />}
        <button onClick={() => setShowNew(true)} className="btn-primary ml-auto"><Plus className="h-4 w-4" /> New announcement</button>
      </div>
      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-ink-950">{a.title}</h3>
              <Badge tone={a.is_published ? 'success' : 'default'}>{a.is_published ? 'Published' : 'Draft'}</Badge>
              <Badge tone="info">{a.scope}{a.target_label ? ` → ${a.target_label}` : ''}</Badge>
              <span className="ml-auto text-xs text-ink-400">{a.created_by} · {a.created_at}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-ink-600">{a.body}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => act(a, { is_published: a.is_published ? 0 : 1 })} className="btn-secondary !py-1.5 text-xs">
                {a.is_published ? 'Unpublish' : 'Publish now'}
              </button>
              <button
                onClick={async () => {
                  if (!confirm('Delete this announcement?')) return;
                  await act(a, { is_published: 0 });
                  try {
                    await fetch('/api/admin/announcements', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement_id: a.id }) });
                    router.refresh();
                  } catch { /* ignore */ }
                }}
                className="btn-ghost !py-1.5 text-xs text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {announcements.length === 0 && <p className="card p-8 text-center text-sm text-ink-500">No announcements yet.</p>}
      </div>

      {showNew && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              try {
                const res = await fetch('/api/admin/announcements', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...form, target_id: form.scope !== 'global' ? Number(form.target_id) : null }),
                });
                const d = await res.json();
                if (!res.ok) throw new Error(d.error ?? 'Failed');
                setShowNew(false);
                setForm({ title: '', body: '', scope: 'global', target_id: '' });
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed');
              }
            }}
          >
            <h3 className="font-bold">New announcement</h3>
            {error && <div className="mt-2"><ErrorBanner error={error} /></div>}
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Title" required minLength={3} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <textarea className="input min-h-[100px]" placeholder="Body" required minLength={3} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <select className="input" value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value, target_id: '' }))}>
                  <option value="global">Global (everyone)</option>
                  <option value="course">A course</option>
                  <option value="workshop">A workshop</option>
                  <option value="community">A community</option>
                </select>
                {form.scope === 'course' && (
                  <select className="input" value={form.target_id} onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}>
                    <option value="">Select course…</option>
                    {targets.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                )}
                {form.scope === 'workshop' && (
                  <select className="input" value={form.target_id} onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}>
                    <option value="">Select workshop…</option>
                    {targets.workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
                  </select>
                )}
                {form.scope === 'community' && (
                  <select className="input" value={form.target_id} onChange={(e) => setForm((f) => ({ ...f, target_id: e.target.value }))}>
                    <option value="">Select community…</option>
                    {targets.communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Publish</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
