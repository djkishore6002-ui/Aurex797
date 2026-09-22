'use client';

import { useState } from 'react';

export function ForgotForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'form' | 'code'>('form');
  const [resetToken, setResetToken] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      // Development mode: surface the code inline (production emails it).
      setResetToken(data.token);
      setStage('code');
      setMessage({ kind: 'ok', text: 'A reset code was issued for your email. In this development build it is shown below:' });
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  };

  const doReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, code, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Reset failed');
      setMessage({ kind: 'ok', text: 'Password updated! You can now log in with your new password.' });
      setNewPassword('');
      setCode('');
    } catch (err) {
      setMessage({ kind: 'err', text: err instanceof Error ? err.message : 'Reset failed' });
    } finally {
      setBusy(false);
    }
  };

  if (stage === 'form') {
    return (
      <form onSubmit={requestCode} className="card space-y-4 p-6">
        {message && (
          <div role="alert" className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${message.kind === 'err' ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand-200 bg-brand-50 text-brand-800'}`}>
            {message.text}
          </div>
        )}
        <div>
          <label className="label" htmlFor="email">
            Account email
          </label>
          <input id="email" type="email" required className="input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? 'Sending…' : 'Email me a reset code'}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={doReset} className="card space-y-4 p-6">
      {message && (
        <div role="alert" className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${message.kind === 'err' ? 'border-red-200 bg-red-50 text-red-700' : 'border-brand-200 bg-brand-50 text-brand-800'}`}>
            {message.text}
          </div>
      )}
      {resetToken && <p className="tamil rounded-xl bg-ink-50 px-4 py-3 text-center text-2xl font-bold tracking-[0.4em]">{resetToken.slice(0, 6)}</p>}
      <div>
        <label className="label" htmlFor="code">
          6-digit reset code
        </label>
        <input id="code" required inputMode="numeric" maxLength={6} className="input tracking-[0.3em]" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
      </div>
      <div>
        <label className="label" htmlFor="newpass">
          New password
        </label>
        <input id="newpass" type="password" required minLength={8} className="input" placeholder="At least 8 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
      </div>
      <button type="submit" disabled={busy || code.length !== 6} className="btn-primary w-full">
        {busy ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  );
}
