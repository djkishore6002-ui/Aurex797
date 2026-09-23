'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImagePlus, Mic, Square, Upload } from 'lucide-react';

export function AskForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [listening, setListening] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) {
      setFile(null);
      setFileName(null);
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setError('File is too large (max 25 MB).');
      return;
    }
    const ok = /^(image\/(png|jpe?g|webp|gif)|audio\/(mpeg|wav|ogg|webm|x-wav))$/.test(f.type);
    if (!ok) {
      setError('Only images and audio files are allowed.');
      return;
    }
    setFile(f);
    setFileName(f.name);
  };

  const toggleVoice = () => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => { lang: string; onresult: ((e: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void; stop: () => void } };
    const Rec = w.webkitSpeechRecognition;
    if (!Rec) {
      setError('Speech capture is not supported in this browser — type your question instead.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new Rec();
    recRef.current = rec;
    rec.lang = 'ta-IN';
    rec.onresult = (e) => {
      const t = e.results[0]?.[0].transcript ?? '';
      setBody((b) => (b ? b + ' ' : '') + t);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('title', title);
      form.append('body', body);
      if (file) form.append('attachment', file);
      if (audioUrl) form.append('audio_url', audioUrl);
      const res = await fetch('/api/questions', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not submit');
      setTitle('');
      setBody('');
      setFile(null);
      setFileName(null);
      setAudioUrl(null);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">{error}</div>}
      <div>
        <label className="label" htmlFor="q-title">
          Question
        </label>
        <input id="q-title" className="input" required minLength={5} placeholder="e.g. When do I use -க்கு (kku)?" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="q-body">
          Details <span className="font-normal text-ink-400">(Tamil or English, sentence you’re stuck on, context…)</span>
        </label>
        <textarea id="q-body" className="input tamil min-h-[100px]" required minLength={10} placeholder="Write as much context as you can — the AI tutor drafts a preliminary answer from it." value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" onClick={toggleVoice} className={`btn-secondary !py-1.5 text-xs ${listening ? '!border-red-300 !text-red-600' : ''}`}>
            {listening ? <Square className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {listening ? 'Stop dictation' : 'Dictate (Tamil)'}
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,audio/mpeg,audio/wav,audio/ogg,audio/webm" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} aria-label="Attach image or audio" />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary !py-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" />
            {fileName ?? 'Attach image / audio'}
          </button>
          {fileName && (
            <button type="button" onClick={() => onFile(null)} className="text-xs font-semibold text-red-600 hover:underline">
              Remove
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-400">A real teacher reviews AI-drafted answers before they count as official.</p>
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? 'Submitting…' : 'Ask & get AI answer'}
        </button>
      </div>
    </form>
  );
}
