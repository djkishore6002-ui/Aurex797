'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Row {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created: string;
  deleted: boolean;
  enrollments: number;
  certificates: number;
}

const ROLE_TONE: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  super_admin: 'warning',
  organizer: 'info',
  teacher: 'success',
  learner: 'default',
};

export function UsersAdmin({ users }: { users: Row[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return users;
    return users.filter((u) => u.email.toLowerCase().includes(t) || u.name.toLowerCase().includes(t) || u.role.includes(t));
  }, [users, q]);

  const patch = async (row: Row, fields: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: row.id, ...fields }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Update failed');
      router.refresh();
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} className="input w-72 !pl-9" placeholder="Search users…" aria-label="Search users" />
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create user</button>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs text-ink-400">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Enrollments</th>
              <th className="px-4 py-3">Certificates</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className={`border-b border-ink-50 last:border-b-0 ${u.deleted ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-ink-900">{u.name}</p>
                  <p className="text-xs text-ink-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={ROLE_TONE[u.role] ?? 'default'}>{u.role.replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3">
                  {u.deleted ? (
                    <Badge tone="danger">Deleted</Badge>
                  ) : u.is_active ? (
                    <Badge tone="success">Active</Badge>
                  ) : (
                    <Badge tone="warning">Deactivated</Badge>
                  )}
                </td>
                <td className="px-4 py-3">{u.enrollments}</td>
                <td className="px-4 py-3">{u.certificates}</td>
                <td className="px-4 py-3 text-xs text-ink-500">{u.created}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setEditing(u)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                      Edit
                    </button>
                    {!u.deleted && (
                      <button onClick={() => patch(u, { is_active: u.is_active ? 0 : 1 })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100">
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    <button onClick={() => setDeleting(u)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-ink-400">
                  No users match “{q}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateUserDialog
          onClose={() => setShowCreate(false)}
          onDone={() => {
            setShowCreate(false);
            router.refresh();
          }}
        />
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Edit {editing.name}</h3>
            <p className="mt-0.5 text-xs text-ink-400">{editing.email}</p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Role</label>
                <select className="input" defaultValue={editing.role} id={`role-${editing.id}`}>
                  {['learner', 'teacher', 'organizer', 'super_admin'].map((r) => (
                    <option key={r} value={r}>{r.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reset password <span className="font-normal text-ink-400">(optional)</span></label>
                <input className="input" id={`pass-${editing.id}`} placeholder="New password (min 8)" autoComplete="off" />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
              <button
                onClick={async () => {
                  const role = (document.getElementById(`role-${editing.id}`) as unknown as HTMLSelectElement).value;
                  const pass = (document.getElementById(`pass-${editing.id}`) as unknown as HTMLInputElement).value;
                  await patch(editing, { role, ...(pass ? { password: pass } : {}) });
                }}
                className="btn-primary"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name ?? 'user'}?`}
        body="This deactivates the account and removes their sessions. Historical records (enrollments, certificates, audit log) are preserved. This cannot be undone from the UI."
        confirmLabel="Delete user"
        requireText="DELETE"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: deleting.id }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Delete failed');
            setDeleting(null);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

function CreateUserDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'learner', native_language: 'en' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <form
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Create failed');
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
            setBusy(false);
          }
        }}
      >
        <h3 className="font-bold">Create user</h3>
        {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-4 space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" required minLength={2} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input className="input" required minLength={8} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Role</label>
              <select className="input" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {['learner', 'teacher', 'organizer', 'super_admin'].map((r) => (
                  <option key={r} value={r}>{r.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Native language</label>
              <select className="input" value={form.native_language} onChange={(e) => setForm((f) => ({ ...f, native_language: e.target.value }))}>
                {['en', 'hi', 'te', 'ml', 'kn', 'ta'].map((l) => (
                  <option key={l} value={l}>{l.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create user'}</button>
        </div>
      </form>
    </div>
  );
}
