'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorBanner } from '@/components/ui';

interface W {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  instructor_name: string | null;
  starts_at: string;
  duration_minutes: number;
  capacity: number;
  meeting_url: string | null;
  price_cents: number;
  registration_deadline: string | null;
  certificate_enabled: number;
  is_published: number;
  seats: number;
  sessions_count: number;
}

export function WorkshopsAdmin({ workshops }: { workshops: W[]; now: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => router.refresh();
  const act = async (w: W, payload: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/workshops', { method: payload.action ? 'PUT' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: w.id, ...payload }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Action failed');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {error && <ErrorBanner error={error} />}
        <button onClick={() => setShowNew(true)} className="btn-primary ml-auto"><Plus className="h-4 w-4" /> Create workshop</button>
      </div>
      <div className="space-y-3">
        {workshops.map((w) => (
          <div key={w.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button onClick={() => setExpanded(expanded === w.id ? null : w.id)} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" aria-label="Toggle workshop details">
                {expanded === w.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-950">{w.title}</p>
                <p className="text-xs text-ink-400">
                  {w.starts_at.replace('T', ' ').slice(0, 16)} UTC · {w.duration_minutes} min · {w.sessions_count} session{w.sessions_count === 1 ? '' : 's'} · {w.seats}/{w.capacity} seats · {w.price_cents > 0 ? `₹${w.price_cents / 100}` : 'Free'}
                </p>
              </div>
              <Badge tone={w.is_published ? 'success' : 'default'}>{w.is_published ? 'Published' : 'Draft'}</Badge>
              <button onClick={() => act(w, { is_published: w.is_published ? 0 : 1 })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                {w.is_published ? 'Unpublish' : 'Publish'}
              </button>
              <a href={`/workshops/${w.slug}`} target="_blank" rel="noreferrer" className="text-xs text-ink-400 hover:text-brand-700">View ↗</a>
              <button onClick={async () => { if (confirm(`Delete “${w.title}”?`)) { await act(w, { action: 'delete' as never }); } }} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {expanded === w.id && (
              <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-sm sm:col-span-2">
                    <span className="label">Meeting URL</span>
                    <input className="input font-mono text-xs" defaultValue={w.meeting_url ?? ''} onBlur={(e) => act(w, { meeting_url: e.target.value || null })} />
                  </label>
                  <label className="text-sm">
                    <span className="label">Capacity</span>
                    <input className="input" type="number" min={1} defaultValue={w.capacity} onBlur={(e) => act(w, { capacity: Number(e.target.value) || w.capacity })} />
                  </label>
                  <label className="text-sm">
                    <span className="label">Price (₹)</span>
                    <input className="input" type="number" min={0} defaultValue={w.price_cents / 100} onBlur={(e) => act(w, { price_cents: Math.round((Number(e.target.value) || 0) * 100) })} />
                  </label>
                  <label className="text-sm">
                    <span className="label">Starts at (UTC)</span>
                    <input className="input" type="datetime-local" defaultValue={w.starts_at.slice(0, 16)} onBlur={(e) => e.target.value && act(w, { starts_at: new Date(e.target.value).toISOString() })} />
                  </label>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-ink-700">
                      <input type="checkbox" className="h-4 w-4 accent-brand-700" defaultChecked={w.certificate_enabled === 1} onChange={(e) => act(w, { certificate_enabled: e.target.checked ? 1 : 0 })} />
                      Certificate at 90%
                    </label>
                  </div>
                </div>
                <p className="mt-3 text-xs text-ink-500">
                  Registrations & attendance: open the <a className="text-brand-700 underline" href={`/workshops/${w.slug}`} target="_blank" rel="noreferrer">workshop page</a> or use{' '}
                  <code className="rounded bg-ink-100 px-1">/api/admin/attendance</code> for organizer-level minute recording.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {showNew && <CreateWorkshopDialog onClose={() => setShowNew(false)} onDone={() => { setShowNew(false); refresh(); }} />}
    </div>
  );
}

function CreateWorkshopDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', starts_at: '', duration_minutes: 60, capacity: 50, price: 0, meeting_url: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <form
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const starts = new Date(form.starts_at || Date.now() + 7 * 86400_000).toISOString();
            const res = await fetch('/api/admin/workshops', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                title: form.title,
                description: form.description,
                starts_at: starts,
                duration_minutes: Number(form.duration_minutes),
                capacity: Number(form.capacity),
                price_cents: Math.round(Number(form.price) * 100),
                meeting_url: form.meeting_url || null,
              }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? 'Create failed');
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
            setBusy(false);
          }
        }}
      >
        <h3 className="font-bold">Create workshop</h3>
        {error && <ErrorBanner error={error} />}
        <div className="mt-4 space-y-3">
          <input className="input" placeholder="Title" required minLength={3} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <textarea className="input min-h-[80px]" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="label">Starts at (local → stored UTC)</span>
              <input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))} />
            </label>
            <label className="text-sm">
              <span className="label">Duration (min)</span>
              <input className="input" type="number" min={15} value={form.duration_minutes} onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))} />
            </label>
            <label className="text-sm">
              <span className="label">Capacity</span>
              <input className="input" type="number" min={1} value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))} />
            </label>
            <label className="text-sm">
              <span className="label">Price (₹, 0 = free)</span>
              <input className="input" type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            </label>
          </div>
          <input className="input font-mono text-xs" placeholder="Meeting URL (https://meet…)" value={form.meeting_url} onChange={(e) => setForm((f) => ({ ...f, meeting_url: e.target.value }))} />
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">
            A first session (90% required minutes) is created automatically. Paid workshops register as <b>PENDING</b> until a payment provider confirms — we never fake payment success.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create workshop'}</button>
        </div>
      </form>
    </div>
  );
}
