'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Cert {
  id: number;
  certificate_id: string;
  participant_name: string;
  learner_email: string;
  title_text: string;
  type: string;
  source_title: string | null;
  attendance_percentage: number | null;
  issued_at: string;
  revoked_at: string | null;
}
interface Template { id: number; name: string; title_text: string; is_default: number; is_active: number }

export function CertificatesAdmin({ certificates, templates }: { certificates: Cert[]; templates: Template[] }) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [revoking, setRevoking] = useState<Cert | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showTpl, setShowTpl] = useState(false);
  const [tpl, setTpl] = useState({ name: '', title_text: 'Certificate of Completion' });

  const filtered = certificates.filter((c) => !q || c.certificate_id.includes(q.toUpperCase()) || c.participant_name.toLowerCase().includes(q.toLowerCase()) || (c.title_text ?? '').toLowerCase().includes(q.toLowerCase()));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="input w-72" placeholder="Search ID or learner…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search certificates" />
        <button onClick={() => setShowTpl(true)} className="btn-secondary ml-auto text-xs">+ New template</button>
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs text-ink-400">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Learner</th>
              <th className="px-4 py-3">For</th>
              <th className="px-4 py-3">Attendance</th>
              <th className="px-4 py-3">Issued</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-ink-50 last:border-b-0">
                <td className="px-4 py-3 font-mono text-xs">{c.certificate_id}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{c.participant_name}</p>
                  <p className="text-xs text-ink-400">{c.learner_email}</p>
                </td>
                <td className="px-4 py-3">
                  <p>{c.title_text}</p>
                  <p className="text-xs text-ink-400">{c.source_title ?? c.type}</p>
                </td>
                <td className="px-4 py-3">{c.attendance_percentage != null ? `${c.attendance_percentage}%` : '—'}</td>
                <td className="px-4 py-3 text-xs">{c.issued_at}</td>
                <td className="px-4 py-3">
                  {c.revoked_at ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Valid</Badge>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <a href={`/verify/${c.certificate_id}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-700 hover:underline">Verify ↗</a>
                    {!c.revoked_at && (
                      <button onClick={() => setRevoking(c)} className="text-xs font-semibold text-red-600 hover:underline">Revoke</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-400">No certificates found.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Templates */}
      <h3 className="mt-8 mb-3 font-bold text-ink-900">Templates</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <div key={t.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{t.name}</p>
              {t.is_default ? <Badge tone="success">default</Badge> : <Badge>option</Badge>}
            </div>
            <p className="mt-1 text-sm text-ink-500">{t.title_text}</p>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!revoking}
        title={`Revoke ${revoking?.certificate_id}?`}
        body="The certificate becomes invalid immediately and the public verification page will show it as revoked. The learner is notified."
        confirmLabel="Revoke certificate"
        requireText="REVOKE"
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (!revoking) return;
          try {
            const res = await fetch('/api/admin/certificates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certificate_id: revoking.certificate_id, reason: reason || 'Revoked by administrator' }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? 'Revoke failed');
            setRevoking(null);
            setReason('');
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Revoke failed');
            setRevoking(null);
          }
        }}
      />
      {revoking && (
        <div className="fixed inset-x-0 bottom-0 z-[75] border-t border-ink-200 bg-white p-4">
          <div className="container-page flex items-center gap-3">
            <label className="label !mb-0">Reason (shown to the learner)</label>
            <input className="input max-w-md" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Attendance record corrected" />
          </div>
        </div>
      )}

      {showTpl && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <form
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await fetch('/api/admin/certificates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tpl) });
                setShowTpl(false);
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed');
              }
            }}
          >
            <h3 className="font-bold">New certificate template</h3>
            <div className="mt-4 space-y-3">
              <input className="input" placeholder="Template name" required value={tpl.name} onChange={(e) => setTpl((t) => ({ ...t, name: e.target.value }))} />
              <input className="input" placeholder="Title text" required value={tpl.title_text} onChange={(e) => setTpl((t) => ({ ...t, title_text: e.target.value }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowTpl(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
