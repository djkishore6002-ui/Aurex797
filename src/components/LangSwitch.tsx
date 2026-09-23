'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DISPLAY_LANGS, LANGS } from '@/lib/i18n-data';

/**
 * Display-language switcher (Tamil is the default / first preference).
 * Writes the choice to `/api/lang` (cookie + profile), then re-renders
 * the server components so the new language takes effect immediately.
 *
 * On the static GitHub Pages snapshot (NEXT_PUBLIC_SOLAI_STATIC=1) there is
 * no server to change the baked-in display language, so picking a language
 * shows a friendly notice instead of failing silently.
 */
const IS_STATIC = process.env.NEXT_PUBLIC_SOLAI_STATIC === '1';

export function LangSwitch({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) {
      setNotice(false);
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  async function pick(code: string) {
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

  const active = LANGS.find((l) => l.code === current) ?? LANGS[0];

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
        <div className="glass absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl p-1 shadow-glow-lg">
          {notice && (
            <p className="mb-1 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
              📸 This public snapshot shows the Tamil-first display. Language
              switching works in the full Solai app.
            </p>
          )}
          {DISPLAY_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => pick(l.code)}
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
          <p className="mt-1 border-t border-white/5 px-3 py-2 text-[10px] leading-relaxed text-ink-500">
            🤖 The AI tutor speaks 14 languages — set your native language in
            your profile and it will explain Tamil in it.
          </p>
        </div>
      )}
    </div>
  );
}
