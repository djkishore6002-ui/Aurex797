import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function AI() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api('/ai/settings').then(setSettings); api('/ai/history').then((d: any) => setMessages(d.items)); }, []);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const suggestions = [
    'How do I say "Hello, how are you?"',
    'Explain நன்றி (nanri)',
    'Teach me the vowels (உயிரெழுத்து)',
    'Give me a quiz',
  ];

  const send = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput('');
    setBusy(true);
    setMessages(m => [...m, { role: 'user', content: msg }]);
    try {
      const res = await api<{reply:string}>('/ai/chat', { method: 'POST', json: { message: msg } });
      setMessages(m => [...m, { role: 'assistant', content: res.reply }]);
    } catch (e: any) {
      setMessages(m => [...m, { role: 'assistant', content: `⚠️ ${e.message}` }]);
    }
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 flex flex-col h-[calc(100vh-60px)] animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">🤖 AI Tamil Tutor</h1>
          <p className="text-sm text-stone-500">
            {settings?.mode === 'byoai' ? 'Using your OpenRouter key' : `Platform AI · ${settings?.daily_limit || 50} msg/day`}
          </p>
        </div>
        <Link to="/ai/settings" className="btn-secondary text-sm">⚙️ Settings</Link>
      </div>

      <div ref={scrollRef} className="flex-1 mt-4 overflow-y-auto card p-4 space-y-3 bg-stone-50 dark:bg-slate-900/50">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-5xl">வணக்கம்!</div>
            <div className="mt-2 font-semibold">I'm your Tamil tutor. Ask me anything!</div>
            <div className="mt-6 grid sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {suggestions.map(s => (
                <button key={s} onClick={() => send(s)} className="card p-3 text-left text-sm hover:border-brand-400 transition">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m: any, i: number) => (
          <div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.role==='user'?'bg-brand-500 text-white':'bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700'}`}>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
            </div>
          </div>
        ))}
        {busy && <div className="flex justify-start"><div className="bg-white dark:bg-slate-800 border border-stone-200 dark:border-slate-700 rounded-2xl px-4 py-2 text-sm text-stone-500">Thinking…</div></div>}
      </div>

      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-3 flex gap-2">
        <input className="input flex-1" placeholder="Ask about Tamil grammar, vocabulary, phrases…" value={input} onChange={e=>setInput(e.target.value)} />
        <button className="btn-primary px-6" disabled={busy || !input.trim()}>{busy?'…':'Send'}</button>
      </form>
      <p className="text-xs text-stone-500 mt-2 text-center">AI can make mistakes. Teachers review questions. Never share private data.</p>
    </div>
  );
}
