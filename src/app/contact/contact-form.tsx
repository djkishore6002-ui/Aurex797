'use client';

import { useState } from 'react';

export function ContactForm({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData(e.currentTarget);
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fd.get('name'), message: fd.get('message') }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send message');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send message');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-brand-200 bg-brand-50 p-6 text-center">
        <p className="text-2xl" aria-hidden>🙏</p>
        <p className="mt-2 font-bold text-ink-950">Message sent!</p>
        <p className="mt-1 text-sm text-ink-600">We usually reply within one working day.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</div>}
      <p className="text-sm text-ink-500">
        Or email us directly at <a href={`mailto:${email}`} className="font-semibold text-brand-700 underline">{email}</a>
      </p>
      <div>
        <label className="label" htmlFor="c-name">Your name</label>
        <input id="c-name" name="name" className="input" required minLength={2} />
      </div>
      <div>
        <label className="label" htmlFor="c-msg">Message</label>
        <textarea id="c-msg" name="message" className="input min-h-[120px]" required minLength={10} />
      </div>
      <button type="submit" disabled={busy} className="btn-primary">
        {busy ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
