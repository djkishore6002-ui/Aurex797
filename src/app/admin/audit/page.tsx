import { getDb } from '@/db';
import { PageHead, Badge } from '@/components/ui';
import { fmtDateTime } from '@/lib/utils';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminAuditPage() {
  const db = getDb();
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 300').all() as unknown as {
    id: number;
    action: string;
    entity: string | null;
    entity_id: number | null;
    actor_email: string | null;
    new_value: string | null;
    created_at: string;
    ip: string | null;
  }[];
  const counts = db.prepare('SELECT action, COUNT(*) c FROM audit_logs GROUP BY action ORDER BY c DESC LIMIT 15').all() as unknown as { action: string; c: number }[];

  return (
    <div>
      <PageHead title="Audit log" subtitle="Every privileged action with actor, entity, values and timestamp — the platform’s tamper-evident history." />

      {counts.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {counts.map((c) => (
            <Badge key={c.action} tone="default">{c.action} × {c.c}</Badge>
          ))}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-ink-100 bg-ink-50 text-left text-xs text-ink-400">
              <th className="px-4 py-3">Time (UTC)</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b border-ink-50 last:border-b-0 align-top">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{fmtDateTime(l.created_at)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{l.actor_email}</td>
                <td className="px-4 py-3"><Badge tone="info">{l.action}</Badge></td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">{l.entity}{l.entity_id ? ` #${l.entity_id}` : ''}</td>
                <td className="max-w-[320px] px-4 py-3 font-mono text-[11px] text-ink-500">{l.new_value?.slice(0, 140) ?? ''}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-ink-400">No audited actions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
