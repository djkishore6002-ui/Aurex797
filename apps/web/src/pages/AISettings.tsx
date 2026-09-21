import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function AISettings() {
  const [s, setS] = useState<any>(null);
  const [mode, setMode] = useState<'platform'|'byoai'>('platform');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('openrouter/auto');
  const [result, setResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { api('/ai/settings').then(d => { setS(d); setMode(d.mode); setModel(d.model || 'openrouter/auto'); }); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api('/ai/settings', { method: 'POST', json: { mode, api_key: apiKey || undefined, model } });
      alert('Settings saved.');
      const d = await api('/ai/settings'); setS(d);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const test = async () => {
    setTesting(true); setResult(null);
    try {
      const r = await api('/ai/test-connection', { method: 'POST', json: { mode, api_key: apiKey || undefined, model } });
      setResult(r);
    } catch (e: any) { setResult({ ok: false, message: e.message }); }
    setTesting(false);
  };

  if (!s) return <div className="p-8 text-center text-stone-500">Loading…</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to="/ai" className="text-sm text-stone-500">← AI Tutor</Link>
      <h1 className="text-2xl font-extrabold mt-2">AI Settings</h1>

      <div className="card p-6 mt-5 space-y-5">
        <div>
          <div className="label">AI Mode</div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={()=>setMode('platform')} className={`card p-4 text-left ${mode==='platform'?'border-brand-500 bg-brand-50 dark:bg-brand-500/10':''}`}>
              <div className="font-bold">Platform AI</div>
              <div className="text-xs text-stone-500 mt-1">Daily limit applies · free</div>
            </button>
            <button onClick={()=>setMode('byoai')} className={`card p-4 text-left ${mode==='byoai'?'border-brand-500 bg-brand-50 dark:bg-brand-500/10':''}`}>
              <div className="font-bold">My own API key</div>
              <div className="text-xs text-stone-500 mt-1">Bring your own OpenRouter key</div>
            </button>
          </div>
        </div>

        <div>
          <div className="label">Provider</div>
          <select className="input" value="openrouter" disabled><option>OpenRouter</option></select>
        </div>

        {mode === 'byoai' && (
          <>
            <div>
              <div className="label">API Key</div>
              <input className="input" type="password" placeholder={s.has_key ? '•••••••• (saved)' : 'sk-or-v1-...'} value={apiKey} onChange={e=>setApiKey(e.target.value)} />
              <p className="text-xs text-stone-500 mt-1">Your key is encrypted at rest and never logged. It is used only to call OpenRouter from this browser session (when stored client-side) or proxied securely from the server.</p>
            </div>
            <div>
              <div className="label">Model</div>
              <input className="input" value={model} onChange={e=>setModel(e.target.value)} placeholder="openrouter/auto" />
              <p className="text-xs text-stone-500 mt-1">Common choices: openai/gpt-4o-mini, anthropic/claude-3-haiku, meta-llama/llama-3.1-8b-instruct, google/gemini-flash-1.5</p>
            </div>
          </>
        )}

        {result && (
          <div className={`p-4 rounded-xl text-sm ${result.ok?'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300':'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300'}`}>
            {result.ok ? '✓ ' : '✗ '}{result.message}{result.latencyMs ? ` (${result.latencyMs}ms)` : ''}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={test} disabled={testing} className="btn-secondary">{testing?'Testing…':'Test connection'}</button>
          <button onClick={save} disabled={saving} className="btn-primary">{saving?'Saving…':'Save settings'}</button>
        </div>

        <div className="text-xs text-stone-500 pt-4 border-t border-stone-200 dark:border-slate-800">
          <div>Platform provider: {s.platform_provider}{s.platform_provider==='mock' && ' (no API key set — using built-in knowledge base)'}</div>
          <div>Daily message limit: {s.daily_limit} / day (platform mode)</div>
        </div>
      </div>
    </div>
  );
}
