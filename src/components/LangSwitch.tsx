'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DISPLAY_LANGS, LANGS } from '@/lib/i18n-data';

/**
 * Language switcher — all 14 languages, two working sections:
 *
 *  1. Display language (தமிழ் / English) — switches the whole UI,
 *     written to /api/lang → cookie + profile, re-renders immediately.
 *  2. AI tutor language (the other 12) — touching one sets the language
 *     the AI tutor explains Tamil in. The ✓ moves to the touched language,
 *     so "touch → comes" is always visible.
 *
 * On the static GitHub Pages snapshot (NEXT_PUBLIC_SOLAI_STATIC=1) there is
 * no server to persist choices, so picking a language shows a friendly
 * notice instead of failing silently.
 */
const IS_STATIC = process.env.NEXT_PUBLIC_SOLAI_STATIC === '1';

type NativeLang = (typeof LANGS)[number];

export function LangSwitch({ current, native = null }: { current: string; native?: string | null }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const [nativeNow, setNativeNow] = useState<string | null>(native);
  const [confirmed, setConfirmed] = useState<NativeLang | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Track the current display language after a switch re-renders.
  useEffect(() => {
    setNativeNow(native);
  }, [native]);

  useEffect(() => {
    if (!open) {
      setNotice(false);
      setConfirmed(null);
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function pickDisplay(code: string) {
    if (IS_STATIC) {
      setNotice(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: code }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function pickNative(code: string) {
    const l = LANGS.find((x) => x.code === code);
    if (!l) return;
    if (IS_STATIC) {
      setNotice(true);
      return;
    }
    // Optimistic: the ✓ moves the instant you touch it.
    setNativeNow(code);
    setConfirmed(l);
    try {
      await fetch('/api/lang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ native: code }),
      });
    } catch {
      /* keep the optimistic state; next visit re-syncs */
    }
  }

  const active = LANGS.find((l) => l.code === current) ?? LANGS[0];
  const aiLangs = LANGS.filter((l) => !DISPLAY_LANGS.some((d) => d.code === l.code));

  return (
    <div ref={ref} className="relative" role="menu" aria-label="Language">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-ink-200 transition hover:border-brand-400/40 hover:bg-white/10"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span aria-hidden>🌐</span>
        <span className="font-semibold">{active.native}</span>
      </button>
      {open && (
        <div className="glass absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl shadow-glow-lg">
          {notice && (
            <p className="m-1 mb-0 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
              📸 This public snapshot is a static preview — language switching
              works in the full Solai app.
            </p>
          )}

          {/* Display language — switches the whole UI */}
          <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Display · காட்டும் மொழி
          </p>
          <div className="p-1 pt-0">
            {DISPLAY_LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => pickDisplay(l.code)}
                disabled={busy}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${
                  l.code === current ? 'bg-brand-500/20 text-brand-100' : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                }`}
              >
                <span>
                  <span className="block font-semibold">{l.native}</span>
                  {l.english !== l.native && <span className="block text-[10px] text-ink-400">{l.english}</span>}
                </span>
                {l.code === current && <span aria-hidden>✓</span>}
              </button>
            ))}
          </div>

          {/* AI tutor language — all 12 other languages, touch to set */}
          <p className="border-t border-white/5 px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-ink-500">
            🤖 AI tutor speaks · அவர் பேசும் மொழி
          </p>
          <div className="max-h-56 overflow-y-auto p-1 pt-0">
            {aiLangs.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => pickNative(l.code)}
                disabled={busy}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left text-xs transition ${
                  l.code === nativeNow ? 'bg-cyan-500/15 text-cyan-100' : 'text-ink-300 hover:bg-white/5 hover:text-ink-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{l.native}</span>
                  <span className="text-[10px] text-ink-400">{l.english}</span>
                </span>
                {l.code === nativeNow && <span aria-hidden>🤖✓</span>}
              </button>
            ))}
          </div>

          {/* Confirmation — "touch → comes" */}
          {confirmed && (
            <p className="mx-1 mb-1 mt-0.5 flex items-start gap-1.5 rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-3 py-2 text-[11px] leading-snug text-emerald-200">
              <span aria-hidden>✓</span>
              <span>
                {confirmed.english} selected — the AI tutor will explain Tamil in{' '}
                <b>{confirmed.english}</b>.
                <span className="tamil block text-[10px] text-emerald-300/80">
                  AI தூதர் இனி {confirmed.english} மொழியில் தமிழ் சொல்வார்.
                </span>
              </span>
            </p>
          )}
          {!confirmed && (
            <p className="border-t border-white/5 px-3 py-2 text-[10px] leading-relaxed text-ink-500">
              Touch a language — the AI tutor will explain Tamil in it.
              <span className="tamil block">மொழியைத் தொட்டுக்கொள்ளுங்கள்.</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
