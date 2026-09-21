import { useEffect, useState } from 'react';
import api from '@/lib/api';

declare global {
  interface Window { SpeechRecognition: any; webkitSpeechRecognition: any; }
}

export default function Speaking() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => { api('/speaking/prompts').then((d: any) => setPrompts(d.prompts)); }, []);

  const current = prompts[idx];

  const start = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setErr('Speech recognition not supported in this browser. Try Chrome or Edge on desktop/Android.'); return; }
    setErr(''); setListening(true); setTranscript(''); setResult(null);
    const rec = new SR();
    rec.lang = 'ta-IN';
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('');
      setTranscript(t);
      if (e.results[0].isFinal) submit(t);
    };
    rec.onerror = (e: any) => { setErr('Recognition error: ' + e.error); setListening(false); };
    rec.onend = () => setListening(false);
    try { rec.start(); } catch (e: any) { setErr(e.message); setListening(false); }
  };

  const submit = async (t: string) => {
    if (!current) return;
    const r = await api('/speaking/analyze', { method: 'POST', json: { expected: current.tamil, transcript: t } });
    setResult(r);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">🎤 Speaking Practice</h1>
      <p className="text-stone-500 mt-1">Say the phrase out loud. We'll check word/character similarity (approximation only — not medical-grade).</p>

      {current && (
        <div className="card p-6 mt-5 text-center">
          <div className="text-xs uppercase tracking-wide text-brand-600 font-bold capitalize">{current.level.replace('_',' ')}</div>
          <div className="font-tamil text-5xl mt-3 text-brand-700 dark:text-brand-300 leading-tight">{current.tamil}</div>
          <div className="italic text-stone-500 mt-2">{current.transliteration}</div>
          <div className="text-lg mt-1">{current.meaning}</div>

          <button onClick={start} disabled={listening} className={`btn-primary mt-6 text-lg px-6 py-3 ${listening?'pulse-ring':''}`}>
            {listening ? '🎙 Listening… speak now' : '🎙 Tap to speak'}
          </button>

          {err && <div className="mt-3 text-red-600 text-sm">{err}</div>}
          {transcript && (
            <div className="mt-4 p-4 rounded-xl bg-stone-50 dark:bg-slate-800 text-left">
              <div className="text-xs text-stone-500">Heard:</div>
              <div className="font-tamil text-lg">{transcript}</div>
            </div>
          )}

          {result && (
            <div className="mt-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-left">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Score</div>
                <div className="text-2xl font-extrabold">{result.score}/100</div>
              </div>
              <div className="progress-track mt-2"><div className="progress-fill" style={{ width: `${result.score}%` }}></div></div>
              <p className="mt-3 text-sm">{result.feedback}</p>
              {result.missing_words?.length > 0 && <div className="text-xs text-stone-500 mt-2">Missing words: {result.missing_words.join(', ')}</div>}
              <div className="text-[11px] text-stone-400 mt-3">{result.note}</div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-5">
        <button onClick={()=>{setIdx(i=>Math.max(0,i-1));setResult(null);setTranscript('');}} className="btn-secondary" disabled={idx===0}>← Previous</button>
        <div className="text-sm text-stone-500">{idx+1} / {prompts.length}</div>
        <button onClick={()=>{setIdx(i=>Math.min(prompts.length-1,i+1));setResult(null);setTranscript('');}} className="btn-secondary" disabled={idx===prompts.length-1}>Next →</button>
      </div>
    </div>
  );
}
