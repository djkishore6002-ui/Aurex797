'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LANGS: [string, string][] = [
  ['en', 'English'],
  ['hi', 'Hindi'],
  ['te', 'Telugu'],
  ['ml', 'Malayalam'],
  ['kn', 'Kannada'],
  ['ta', 'Tamil'],
];

export function ProfileClient({
  user,
  byoai,
}: {
  user: { name: string; native_language: string; tamil_level: string; learning_goal: string; bio: string; privacy_public: boolean };
  byoai: { hint: string | null; enabled: boolean };
}) {
  const router = useRouter();
  const [form, setForm] = useState(user);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // BYOAI
  const [apiKey, setApiKey] = useState('');
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save');
      setMsg({ ok: true, text: 'Profile saved.' });
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save' });
    } finally {
      setBusy(false);
    }
  };

  const setKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setKeyMsg(null);
    try {
      const res = await fetch('/api/ai/byoai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: apiKey }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save key');
      setKeyMsg({ ok: true, text: `Key saved (stored encrypted, shown only as ${data.hint}). Use it in the tutor by choosing “My OpenRouter AI”.` });
      setApiKey('');
      router.refresh();
    } catch (err) {
      setKeyMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not save key' });
    }
  };

  const deleteKey = async () => {
    if (!confirm('Delete your stored OpenRouter key?')) return;
    await fetch('/api/ai/byoai', { method: 'DELETE' }).catch(() => undefined);
    setKeyMsg({ ok: true, text: 'Key deleted.' });
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="card space-y-4 p-6">
        <h2 className="font-bold text-ink-950">Profile & preferences</h2>
        {msg && (
          <div role="status" className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${msg.ok ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {msg.text}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">Display name</label>
            <input id="p-name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required minLength={2} />
          </div>
          <div>
            <label className="label" htmlFor="p-lang">Native language (for AI explanations)</label>
            <select id="p-lang" className="input" value={form.native_language} onChange={(e) => setForm((f) => ({ ...f, native_language: e.target.value }))}>
              {LANGS.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-level">Tamil level</label>
            <select id="p-level" className="input" value={form.tamil_level} onChange={(e) => setForm((f) => ({ ...f, tamil_level: e.target.value }))}>
              {['beginner', 'intermediate', 'advanced', 'native'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-goal">Learning goal</label>
            <input id="p-goal" className="input" value={form.learning_goal} onChange={(e) => setForm((f) => ({ ...f, learning_goal: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="p-bio">Bio</label>
          <textarea id="p-bio" className="input min-h-[70px]" value={form.bio} onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))} />
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink-700">
          <input type="checkbox" className="h-4 w-4 accent-brand-700" checked={form.privacy_public} onChange={(e) => setForm((f) => ({ ...f, privacy_public: e.target.checked }))} />
          Show my name and progress in community posts
        </label>
        <div className="flex justify-end">
          <button type="submit" disabled={busy} className="btn-primary">
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <div className="card space-y-4 p-6">
        <h2 className="font-bold text-ink-950">My OpenRouter AI key (BYOAI) <span className="ml-1 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-bold uppercase text-ink-500">Optional</span></h2>
        {keyMsg && (
          <div role="status" className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${keyMsg.ok ? 'border-brand-200 bg-brand-50 text-brand-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {keyMsg.text}
          </div>
        )}
        {byoai.enabled ? (
          byoai.hint ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-xl bg-ink-50 px-4 py-2.5 font-mono text-sm">{byoai.hint}</p>
              <button onClick={deleteKey} className="btn-danger !py-2 text-xs">Delete key</button>
            </div>
          ) : (
            <form onSubmit={setKey} className="space-y-3">
              <p className="text-sm leading-relaxed text-ink-500">
                <b>Security:</b> the key is encrypted before it is stored, used only on the server side for <i>your</i> AI requests, never shown to anyone else, never logged, and excluded from analytics. You can delete it at any time. Prefer the platform AI? Just don’t add a key.
              </p>
              <div className="flex gap-2">
                <input className="input font-mono" placeholder="sk-or-…" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required minLength={16} autoComplete="off" aria-label="OpenRouter API key" />
                <button type="submit" className="btn-primary shrink-0">Store key</button>
              </div>
            </form>
          )
        ) : (
          <p className="text-sm text-ink-500">BYOAI is currently disabled by the platform administrator.</p>
        )}
      </div>
    </div>
  );
}
