'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Badge, ErrorBanner } from '@/components/ui';

interface Workshop {
  id: number;
  slug: string;
  title: string;
  sessions: { id: number; title: string; starts_at: string; required_minutes: number }[];
}
interface Registrant {
  user_id: number;
  name: string;
  email: string;
  reg_status: string;
  attended_minutes: number | null;
  att_status: string | null;
  attendance_id: number | null;
}
interface Row {
  id: number;
  name: string;
  email: string;
  attended_minutes: number;
  attendance_percentage: number;
  status: string;
  source: string;
}

export function AttendanceAdmin({ workshops }: { workshops: Workshop[] }) {
  const [openWs, setOpenWs] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [registrants, setRegistrants] = useState<Registrant[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [minutes, setMinutes] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async (wsId: number, sId: number) => {
    setError(null);
    try {
      const res = await fetch(`/api/admin/attendance?session_id=${sId}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Load failed');
      setRegistrants(d.registrants ?? []);
      setRows(d.rows ?? []);
      setMinutes({});
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    }
  }, []);

  useEffect(() => {
    if (sessionId && openWs) load(openWs, sessionId);
  }, [sessionId, openWs, load]);

  const record = async (userId: number) => {
    if (!sessionId || !openWs) return;
    const m = Number(minutes[userId]);
    if (isNaN(m) || m < 0) return;
    setBusy(userId);
    try {
      const res = await fetch('/api/admin/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId, user_id: userId, attended_minutes: m, source: 'organizer' }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Record failed');
      load(openWs, sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Record failed');
    } finally {
      setBusy(null);
    }
  };

  if (workshops.length === 0) return <p className="card p-8 text-center text-sm text-ink-500">No workshops assigned to you yet.</p>;

  return (
    <div className="space-y-3">
      {error && <ErrorBanner error={error} />}
      {workshops.map((w) => (
        <div key={w.id} className="card overflow-hidden">
          <button onClick={() => setOpenWs(openWs === w.id ? null : w.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-ink-50" aria-expanded={openWs === w.id}>
            <span className="font-bold">{w.title}</span>
            <span className="text-xs text-ink-400">{w.sessions.length} session{w.sessions.length === 1 ? '' : 's'}</span>
            {openWs === w.id ? <ChevronUp className="ml-auto h-4 w-4 text-ink-400" /> : <ChevronDown className="ml-auto h-4 w-4 text-ink-400" />}
          </button>
          {openWs === w.id && (
            <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {w.sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSessionId(sessionId === s.id ? null : s.id)}
                    className={`rounded-xl border px-3.5 py-2 text-left text-sm ${sessionId === s.id ? 'border-brand-500 bg-brand-500/15 font-semibold' : 'border-ink-200 bg-white/5'}`}
                  >
                    {s.title}
                    <span className="block text-[11px] font-normal text-ink-400">
                      {s.starts_at.replace('T', ' ').slice(0, 16)} UTC · {s.required_minutes} min required
                    </span>
                  </button>
                ))}
              </div>

              {sessionId && (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-ink-200 text-left text-xs text-ink-400">
                        <th className="px-3 py-2">Learner</th>
                        <th className="px-3 py-2">Registration</th>
                        <th className="px-3 py-2">Attended (min)</th>
                        <th className="px-3 py-2">%</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Record minutes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrants.map((r) => {
                        const row = rows.find((x) => x.email === r.email);
                        const regOk = ['CONFIRMED', 'PAID'].includes(r.reg_status);
                        return (
                          <tr key={r.user_id} className="border-b border-ink-100 last:border-b-0">
                            <td className="px-3 py-2.5">
                              <p className="font-semibold">{r.name}</p>
                              <p className="text-xs text-ink-400">{r.email}</p>
                            </td>
                            <td className="px-3 py-2.5">
                              <Badge tone={r.reg_status === 'PENDING' ? 'warning' : 'success'}>{r.reg_status}</Badge>
                            </td>
                            <td className="px-3 py-2.5">{row?.attended_minutes ?? r.attended_minutes ?? 0}</td>
                            <td className="px-3 py-2.5 font-semibold">{row ? `${row.attendance_percentage}%` : '—'}</td>
                            <td className="px-3 py-2.5">
                              {row ? (
                                <Badge tone={row.status === 'present' ? 'success' : row.status === 'partial' ? 'warning' : 'default'}>{row.status}</Badge>
                              ) : (
                                <span className="text-xs text-ink-400">not recorded</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-end gap-2">
                                <input
                                  className="input w-24 !py-1.5 text-right text-sm"
                                  type="number"
                                  min={0}
                                  defaultValue={row?.attended_minutes ?? ''}
                                  placeholder="min"
                                  disabled={!regOk}
                                  onChange={(e) => setMinutes((m) => ({ ...m, [r.user_id]: e.target.value }))}
                                />
                                <button onClick={() => record(r.user_id)} disabled={busy === r.user_id || !regOk} className="btn-primary !py-1.5 text-xs">
                                  {busy === r.user_id ? '…' : 'Record'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {registrants.length === 0 && (
                        <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-ink-400">No registrations for this workshop.</td></tr>
                      )}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-ink-400">
                    Organizer recording = legitimate manual correction (spec §26). Percentage = minutes ÷ required × 100, capped at 100. 90%+ → <b>present</b> → counts toward the certificate.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
