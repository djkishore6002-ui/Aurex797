'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, Copy, History, RefreshCw, Send, Sparkles, ThumbsDown, ThumbsUp, Trash2, X } from 'lucide-react';
import { MarkdownLite } from './Markdown';

export interface TutorContext {
  type: 'lesson' | 'workshop' | 'vocabulary' | 'page' | 'scenario' | 'general';
  id?: number;
  label: string;
  text?: string;
}

interface Msg {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  citations?: { title: string; source_type: string }[];
  cached?: boolean;
  rating?: 'up' | 'down' | null;
}

/**
 * Floating AI Tamil Tutor.
 * Context is passed two ways:
 *  1. prop `context` (when a page mounts its own instance)
 *  2. custom event 'solai:tutor-context' dispatched by TutorContextBridge on
 *     lesson/workshop pages, so the single layout instance stays context-aware.
 */
export function AiTutor({ context }: { context?: TutorContext }) {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [externalCtx, setExternalCtx] = useState<TutorContext | undefined>(undefined);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const ctx = context ?? externalCtx;

  // Context changed → fresh conversation
  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [ctx?.type, ctx?.id]);

  // Listen for context events from TutorContextBridge
  useEffect(() => {
    const handler = (e: Event) => {
      setExternalCtx((e as CustomEvent<TutorContext | null>).detail ?? undefined);
    };
    window.addEventListener('solai:tutor-context', handler);
    return () => window.removeEventListener('solai:tutor-context', handler);
  }, []);

  // Load prior conversation when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/ai/history')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        const msgs = (data.messages ?? []) as unknown as Msg[];
        if (msgs.length) setMessages(msgs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, busy, open]);

  const send = useCallback(
    async (text?: string) => {
      const q = (text ?? input).trim();
      if (!q || busy) return;
      setInput('');
      setError(null);
      setMessages((m) => [...m, { role: 'user', content: q }]);
      setBusy(true);
      try {
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, context: ctx ?? null }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
        setMessages((m) => [
          ...m,
          { role: 'assistant', content: data.answer, provider: data.provider, citations: data.citations, cached: data.cached, rating: null },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setBusy(false);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    },
    [input, busy, ctx]
  );

  const rate = useCallback(
    (idx: number, rating: 'up' | 'down') => {
      if (messages[idx]?.role !== 'assistant') return;
      setMessages((m) => m.map((msg, i) => (i === idx ? { ...msg, rating } : msg)));
      fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, answer: messages[idx].content.slice(0, 400) }),
      }).catch(() => undefined);
    },
    [messages]
  );

  const contextLabel =
    ctx?.type === 'lesson'
      ? 'Ask about this lesson'
      : ctx?.type === 'workshop'
        ? 'Ask about this workshop'
        : ctx?.type === 'vocabulary'
          ? 'Ask about this word'
          : 'Ask the Tamil Tutor';

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Open AI Tamil Tutor — ${contextLabel}`}
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-brand-700 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl shadow-brand-900/30 transition-transform hover:scale-105 hover:bg-brand-800 sm:bottom-6"
      >
        <Sparkles className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">Tamil Tutor</span>
        <span aria-hidden className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-marigold-400 text-[10px]">
          <Bot className="h-3.5 w-3.5 text-brand-950" />
        </span>
      </button>
    );
  }

  return (
    <div className="fixed right-3 bottom-16 z-50 w-[calc(100vw-1.5rem)] max-w-sm sm:right-4 sm:bottom-4" role="dialog" aria-label="AI Tamil Tutor">
      <div className="flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl" style={{ height: minimized ? '52px' : 'min(640px, calc(100dvh - 7rem))' }}>
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-ink-100 bg-brand-800 px-4 py-3 text-white">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">AI Tamil Tutor</p>
            <p className="truncate text-[11px] text-brand-200">
              {ctx ? `${contextLabel} · ${ctx.label}` : 'Vanakkam! How can I help you learn Tamil?'}
            </p>
          </div>
          <button onClick={() => setShowHistory((s) => !s)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Conversation history" title="History">
            <History className="h-4 w-4" />
          </button>
          <button onClick={() => setMessages([])} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Clear chat" title="Clear chat">
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={() => setMinimized((m) => !m)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label={minimized ? 'Expand chat' : 'Minimize chat'}>
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 hover:bg-white/15" aria-label="Close chat">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!minimized && (
          <>
            {showHistory && (
              <div className="border-b border-ink-100 bg-ink-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">This conversation</p>
                  <button
                    onClick={async () => {
                      setMessages([]);
                      setShowHistory(false);
                      await fetch('/api/ai/history', { method: 'DELETE' }).catch(() => undefined);
                    }}
                    className="text-xs font-semibold text-red-600 hover:underline"
                  >
                    Clear history
                  </button>
                </div>
                {messages.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-500">No messages yet — ask your first question!</p>
                ) : (
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {messages.slice(-8).map((m, i) => (
                      <li key={i} className="truncate text-xs text-ink-600">
                        <span className="font-semibold">{m.role === 'user' ? 'You:' : 'Tutor:'}</span> {m.content.replace(/\n/g, ' ')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Messages */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-ink-50/40 px-4 py-4">
              {messages.length === 0 && !busy && (
                <div className="space-y-3">
                  <div className="rounded-2xl rounded-tl-sm bg-white p-3.5 text-sm shadow-sm">
                    <MarkdownLite
                      text={
                        'Vanakkam! 🙏 I am your **AI Tamil Tutor**.\n\nI can:\n• Answer questions about the page you are viewing\n• Explain any Tamil word, grammar rule or sentence\n• Translate Tamil ↔ English\n• Give practice sentences and check your Tamil\n\nTry: *What does வணக்கம் mean?*'
                      }
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(ctx?.type === 'lesson'
                      ? ['Explain the grammar in this lesson', 'What does this sentence mean?', 'Quiz me on this lesson']
                      : ['What is the 90% certificate rule?', 'எனக்கு ஒரு தேநீர் வேண்டும் — explain this', 'How do I start learning Tamil?']
                    ).map((s) => (
                      <button key={s} onClick={() => send(s)} className="rounded-full border border-brand-300 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-brand-50">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] ${
                      m.role === 'user'
                        ? 'rounded-2xl rounded-tr-sm bg-brand-700 p-3 text-sm text-white'
                        : 'rounded-2xl rounded-tl-sm bg-white p-3.5 shadow-sm'
                    }`}
                  >
                    {m.role === 'assistant' ? (
                      <>
                        <MarkdownLite text={m.content} />
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-2">
                          {m.citations && m.citations.length > 0 && <span className="badge bg-ink-100 text-[10px] text-ink-500">📚 {m.citations[0].title}</span>}
                          <span className="text-[10px] text-ink-400">
                            {m.cached ? 'cached · ' : ''}
                            {m.provider === 'local' ? 'local tutor' : m.provider}
                          </span>
                          <span className="ml-auto flex items-center gap-0.5">
                            <button onClick={() => navigator.clipboard?.writeText(m.content)} className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700" aria-label="Copy answer" title="Copy">
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                const lastUser = [...messages.slice(0, i)].reverse().find((x) => x.role === 'user');
                                if (lastUser) send(lastUser.content);
                              }}
                              className="rounded p-1 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
                              aria-label="Regenerate answer"
                              title="Regenerate"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => rate(i, 'up')}
                              className={`rounded p-1 hover:bg-ink-100 ${m.rating === 'up' ? 'text-brand-600' : 'text-ink-400'}`}
                              aria-label="Mark helpful"
                              title="Helpful"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => rate(i, 'down')}
                              className={`rounded p-1 hover:bg-ink-100 ${m.rating === 'down' ? 'text-red-500' : 'text-ink-400'}`}
                              aria-label="Mark not helpful"
                              title="Not helpful"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-400" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-500 [animation-delay:150ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600 [animation-delay:300ms]" />
                  </div>
                </div>
              )}
              {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-end gap-2 border-t border-ink-100 bg-white p-3"
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={ctx ? contextLabel : 'Type your Tamil question…'}
                aria-label="Your question"
                className="input max-h-28 min-h-[42px] resize-none"
              />
              <button type="submit" disabled={busy || !input.trim()} className="btn-primary h-[42px] shrink-0 !px-3.5" aria-label="Send">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
