'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';

interface Org {
  id: number;
  email: string;
  name: string;
  active: boolean;
  created: string;
  title: string;
  permissions: string[];
}

const ALL_PERMS = ['courses', 'workshops', 'attendance', 'announcements', 'questions', 'communities'];

export function OrganizersAdmin({ organizers }: { organizers: Org[] }) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', password: '', title: 'Organizer' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const togglePerm = async (o: Org, perm: string) => {
    const next = o.permissions.includes(perm) ? o.permissions.filter((p) => p !== perm) : [...o.permissions, perm];
    await fetch('/api/admin/organizers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer_id: o.id, permissions: next }) });
    router.refresh();
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create organizer</button>
      </div>
      <div className="space-y-3">
        {organizers.map((o) => (
          <div key={o.id} className="card p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-950">{o.name} {o.active ? '' : <Badge tone="danger">deactivated</Badge>}</p>
                <p className="text-xs text-ink-400">{o.email} · {o.title || 'Organizer'} · since {o.created}</p>
              </div>
              <button
                onClick={async () => {
                  await fetch('/api/admin/organizers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer_id: o.id, is_active: o.active ? 0 : 1 }) });
                  router.refresh();
                }}
                className="btn-secondary !py-1.5 text-xs"
              >
                {o.active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ALL_PERMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePerm(o, p)}
                  className={`badge ${o.permissions.includes(p) ? 'bg-brand-700 text-white' : 'bg-ink-100 text-ink-500'}`}
                  title="Toggle permission"
                >
                  {o.permissions.includes(p) ? '✓ ' : ''}
                  {p}
                </button>
              ))}
            </div>
          </div>
        ))}
        {organizers.length === 0 && <p className="card p-8 text-center text-sm text-ink-500">No organizers yet.</p>}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const res = await fetch('/api/admin/organizers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? 'Create failed');
                setShowCreate(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Create failed');
                setBusy(false);
              }
            }}
          >
            <h3 className="font-bold">Create organizer</h3>
            {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Full name" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <input className="input" type="email" placeholder="Email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <input className="input" placeholder="Temporary password (min 8)" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              <input className="input" placeholder="Title (e.g. Workshop Lead)" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
