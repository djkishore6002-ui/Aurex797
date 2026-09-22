'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { compareSentences, feedbackForScore } from '@/lib/pronunciation';

interface Sentence {
  id: number;
  tamil: string;
  transliteration: string;
  meaning: string;
  example_tamil: string | null;
  example_meaning: string | null;
}

interface SpeechRecognitionLike {
  new (): {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((e: { results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
    onerror: ((e: { error: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  };
}

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionLike; webkitSpeechRecognition?: SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function SpeakClient({ sentences }: { sentences: Sentence[] }) {
  const [selected, setSelected] = useState(0);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState<string | null>(null);
  const [result, setResult] = useState<ReturnType<typeof compareSentences> | null>(null);
  const [unsupported, setUnsupported] = useState(false);
  const recRef = useRef<InstanceType<SpeechRecognitionLike> | null>(null);

  const s = sentences[selected];
  const expected = s.example_tamil ?? s.tamil;
  const expectedMeaning = s.example_meaning ?? s.meaning;

  useEffect(() => {
    if (!getRecognition()) setUnsupported(true);
    setHeard(null);
    setResult(null);
  }, [selected]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ta-IN';
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  };

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Rec = getRecognition();
    if (!Rec) {
      setUnsupported(true);
      return;
    }
    const rec = new Rec();
    recRef.current = rec;
    rec.lang = 'ta-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0]?.[0].transcript ?? '';
      setHeard(transcript);
      setResult(compareSentences(expected, transcript));
    };
    rec.onerror = () => {
      setListening(false);
      setHeard((h) => h ?? 'Could not hear you — check microphone permission and try again.');
    };
    rec.onend = () => setListening(false);
    setHeard(null);
    setResult(null);
    setListening(true);
    rec.start();
  };

  const fb = result ? feedbackForScore(result.score) : null;

  return (
    <div className="space-y-5">
      {/* Sentence picker */}
      <div className="card p-5">
        <label className="label" htmlFor="sentence">
          Pick a sentence
        </label>
        <select id="sentence" className="input" value={selected} onChange={(e) => setSelected(Number(e.target.value))}>
          {sentences.map((x, i) => (
            <option key={x.id} value={i}>
              {x.example_tamil ?? x.tamil} — {x.example_meaning ?? x.meaning}
            </option>
          ))}
        </select>
      </div>

      {/* Expected sentence */}
      <div className="card p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Expected sentence</p>
        <p className="tamil mt-3 text-3xl font-bold leading-relaxed text-ink-950">{expected}</p>
        <p className="mt-2 text-sm italic text-ink-500">/ {s.transliteration} /</p>
        <p className="mt-1 text-sm text-ink-600">{expectedMeaning}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button onClick={() => speak(expected)} className="btn-secondary">
            🔊 Hear it
          </button>
          <button onClick={toggle} className={listening ? 'btn-danger' : 'btn-primary'}>
            {listening ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {listening ? 'Stop listening…' : 'Speak now'}
          </button>
        </div>
        {unsupported && (
          <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-xs text-ink-500">
            Your browser does not expose the Web Speech API (best supported in Chrome and Edge). You can still read aloud and use the manual comparison below.
          </p>
        )}
      </div>

      {listening && (
        <div className="card flex items-center gap-3 border-brand-300 bg-brand-50 p-4">
          <span className="relative flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-60" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-brand-600" />
          </span>
          <p className="text-sm font-medium text-brand-900">Listening… say the sentence in Tamil.</p>
        </div>
      )}

      {heard && (
        <div className="card p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">We heard</p>
          <p className="tamil mt-2 text-xl text-ink-900">{heard}</p>
          {result && fb && (
            <div className="mt-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className={`grid h-16 w-16 place-items-center rounded-full text-lg font-extrabold ${result.score >= 70 ? 'bg-brand-100 text-brand-800' : 'bg-marigold-100 text-marigold-800'}`}>
                  {result.score}
                </div>
                <div>
                  <p className="font-bold text-ink-950">{fb.label} — {result.matchedCount}/{result.total} words matched</p>
                  <p className="text-sm text-ink-600">{fb.message}</p>
                </div>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {result.words.map((w, i) => (
                  <li
                    key={i}
                    className={`tamil rounded-xl px-3 py-2 text-sm font-semibold ${w.matched ? 'bg-brand-50 text-brand-900' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}
                    title={w.matched ? `Recognized: ${w.recognized}` : 'Not matched — say this word again'}
                  >
                    {w.word}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-400">Green = matched · Red = try again. Word-level comparison only — it does not judge accent or tone.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
