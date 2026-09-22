'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui';
import { ClaimCertificateButton } from '@/components/ClaimCertificateButton';
import { ProgressBar } from '@/components/ui';

interface SessionRow {
  id: number;
  title: string;
  starts_at: string;
  duration_minutes: number;
  required_minutes: number;
  my_attendance: number | null;
  my_join: string | null;
}

export function RegisterAttend({
  workshopId,
  priceCents,
  registrationStatus,
  sessions,
  attendanceSummary,
  certificateEnabled,
  meetingUrl,
  deadline,
}: {
  workshopId: number;
  priceCents: number;
  registrationStatus: string | null;
  sessions: SessionRow[];
  attendanceSummary: { percentage: number; eligible: boolean; totalRequiredMinutes: number; totalAttendedMinutes: number } | null;
  certificateEnabled: boolean;
  meetingUrl: string | null;
  deadline: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const register = async () => {
    setBusy('register');
    setError(null);
    try {
      const res = await fetch('/api/workshops/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: workshopId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed');
      setBusy(null);
    }
  };

  const cancel = async () => {
    if (!confirm('Cancel your registration for this workshop?')) return;
    setBusy('cancel');
    setError(null);
    try {
      const res = await fetch('/api/workshops/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workshop_id: workshopId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not cancel');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not cancel');
      setBusy(null);
    }
  };

  const checkIn = async (sessionId: number) => {
    setBusy(`in-${sessionId}`);
    setError(null);
    try {
      const res = await fetch('/api/attendance/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Check-in failed');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed');
      setBusy(null);
    }
  };

  const checkOut = async (sessionId: number) => {
    setBusy(`out-${sessionId}`);
    setError(null);
    try {
      const res = await fetch('/api/attendance/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Check-out failed');
      alert(`Checked out. You attended ${Math.round(data.attended_minutes)} min (${data.percentage}%) for this session.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-out failed');
      setBusy(null);
    }
  };

  const now = Date.now();
  const registered = ['CONFIRMED', 'PAID'].includes(registrationStatus ?? '');

  return (
    <div className="space-y-6">
      {/* Registration card */}
      <div className="card p-6">
        {registrationStatus === 'PENDING' ? (
          <div className="rounded-xl border border-marigold-300 bg-marigold-50 p-4">
            <p className="font-bold text-marigold-900">⏳ Payment pending</p>
            <p className="mt-1 text-sm text-marigold-800">
              This workshop is <b>₹{priceCents / 100}</b>. A payment provider is not configured in this development build, so your seat is held as PENDING — no payment was taken or simulated. When payments go live, your seat will be confirmed automatically after payment.
            </p>
            <button onClick={cancel} disabled={busy === 'cancel'} className="btn-secondary mt-3">
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel registration'}
            </button>
          </div>
        ) : registered ? (
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="success">✓ Registered ({registrationStatus})</Badge>
              {meetingUrl && (
                <a href={meetingUrl} target="_blank" rel="noreferrer" className="btn-primary">
                  Join meeting →
                </a>
              )}
              <button onClick={cancel} disabled={busy === 'cancel'} className="btn-ghost !text-red-600">
                {busy === 'cancel' ? 'Cancelling…' : 'Cancel registration'}
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Attendance runs on server timestamps: check in when the session starts, check out when you leave. Reach 90% overall to unlock the certificate.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-2xl font-extrabold">{priceCents > 0 ? `₹${priceCents / 100}` : 'Free'}</p>
              {deadline && <p className="text-xs text-ink-400">Register by {deadline.replace('T', ' ').slice(0, 16)} UTC</p>}
            </div>
            <button onClick={register} disabled={busy === 'register'} className="btn-primary">
              {busy === 'register' ? 'Registering…' : priceCents > 0 ? 'Reserve my seat' : 'Register free'}
            </button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      </div>

      {/* Sessions + attendance */}
      {registered && (
        <div className="card p-6">
          <h2 className="font-bold text-ink-950">Sessions & attendance</h2>
          {attendanceSummary && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span>
                  Overall: <b>{Math.round(attendanceSummary.totalAttendedMinutes)}/{attendanceSummary.totalRequiredMinutes} required minutes</b>
                </span>
                <span className={`font-bold ${attendanceSummary.eligible ? 'text-brand-700' : 'text-ink-700'}`}>{attendanceSummary.percentage}%</span>
              </div>
              <ProgressBar value={attendanceSummary.percentage} label="Attendance" />
              <p className="mt-2 text-xs text-ink-500">
                {attendanceSummary.eligible
                  ? '🎉 You have reached the 90% requirement — the certificate is available below.'
                  : '90% required for the certificate. Join each session and check in/out.'}
              </p>
            </div>
          )}
          <ul className="mt-5 space-y-3">
            {sessions.map((s) => {
              const inSession = now > new Date(s.starts_at).getTime() - 15 * 60_000 && now < new Date(s.starts_at).getTime() + s.duration_minutes * 60_000 + 15 * 60_000;
              const hasJoined = s.my_join != null;
              return (
                <li key={s.id} className={`rounded-xl border p-4 ${inSession ? 'border-brand-400 bg-brand-50/50' : 'border-ink-100'}`}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900">{s.title}</p>
                      <p className="text-xs text-ink-500">
                        {s.starts_at.replace('T', ' ').slice(0, 16)} UTC · {s.duration_minutes} min · {Math.round(s.required_minutes)} min required
                      </p>
                    </div>
                    {s.my_attendance != null && <Badge tone={s.my_attendance >= 90 ? 'success' : 'warning'}>{s.my_attendance}% attended</Badge>}
                    {inSession && !hasJoined && (
                      <button onClick={() => checkIn(s.id)} disabled={busy === `in-${s.id}`} className="btn-primary !py-2 text-xs">
                        {busy === `in-${s.id}` ? 'Checking in…' : '✓ Check in (live)'}
                      </button>
                    )}
                    {hasJoined && s.my_attendance === 0 && (
                      <button onClick={() => checkOut(s.id)} disabled={busy === `out-${s.id}`} className="btn-danger !py-2 text-xs">
                        {busy === `out-${s.id}` ? 'Checking out…' : 'Check out'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Certificate */}
      {certificateEnabled && registered && (
        <div className="card border-brand-200 bg-gradient-to-br from-brand-50 to-white p-6">
          <h2 className="font-bold text-ink-950">🎓 Certificate</h2>
          <p className="mt-1 text-sm text-ink-600">
            {attendanceSummary?.eligible ? (
              'You have met the 90% attendance requirement. Claim your certificate — it will be instantly verifiable by anyone via its ID and QR code.'
            ) : (
              'Attend at least 90% of the total required minutes across sessions to unlock this certificate. The rule is enforced by the platform — attendance records, not AI, decide eligibility.'
            )}
          </p>
          {attendanceSummary?.eligible && (
            <div className="mt-4">
              <ClaimCertificateButton kind="workshop" id={workshopId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
