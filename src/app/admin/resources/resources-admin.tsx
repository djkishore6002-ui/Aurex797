'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Row {
  id: number;
  title: string;
  title_tamil: string | null;
  type: string;
  provider: string;
  url: string;
  youtube_id: string | null;
  description: string | null;
  language: string;
  level: string | null;
  sort_order: number;
  is_published: number;
}

interface Course {
  id: number;
  title: string;
}

const TYPES = ['video', 'live_class', 'playlist', 'course', 'note', 'book', 'guide', 'article'];
const TYPE_LABELS: Record<string, string> = { video: 'Video', live_class: 'Live teaching', playlist: 'Playlist', course: 'Course', note: 'Note', book: 'Book', guide: 'Guide', article: 'Article' };
const PROVIDERS = [
  ['youtube', 'YouTube'],
  ['npel', 'NPTEL'],
  ['alison', 'Alison'],
  ['website', 'Website'],
  ['pdf', 'PDF'],
  ['other', 'Other'],
];

export function ResourcesAdmin({ resources, courses }: { resources: Row[]; courses: Course[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    title_tamil: '',
    type: 'video',
    provider: 'youtube',
    url: '',
    youtube_id: '',
    description: '',
    language: 'ta',
    level: 'beginner',
    course_id: '',
    sort_order: '0',
  });

  async function act(p: Promise<Response>, label: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await p;
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setMsg(label);
      router.refresh();
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : 'request failed'}`);
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    act(
      fetch('/api/admin/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          title_tamil: form.title_tamil || null,
          youtube_id: form.youtube_id || null,
          course_id: form.course_id ? Number(form.course_id) : null,
          sort_order: Number(form.sort_order) || 0,
        }),
      }),
      'Resource created ✓'
    );
  }

  return (
    <div className="space-y-8">
      {msg && <div className="rounded-lg border border-brand-400/30 bg-brand-500/10 px-4 py-2 text-sm text-brand-200">{msg}</div>}

      {/* Create form */}
      <form onSubmit={submit} className="card grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs font-medium text-ink-400 sm:col-span-1">
          Title *
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="input mt-1"
            placeholder="Alison – Tamil for Beginners"
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          Title (Tamil)
          <input
            value={form.title_tamil}
            onChange={(e) => setForm({ ...form, title_tamil: e.target.value })}
            className="input mt-1"
            placeholder="அலிசன் – தொடக்க தமிழ்"
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input mt-1">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t] ?? t}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-400">
          Provider
          <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="input mt-1">
            {PROVIDERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-400 sm:col-span-2">
          URL *
          <input
            required
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="input mt-1"
            placeholder="https://…"
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          YouTube ID (for embed)
          <input
            value={form.youtube_id}
            onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
            className="input mt-1"
            placeholder="e.g. bhF5iR1rufo"
          />
        </label>
        <label className="text-xs font-medium text-ink-400">
          Language
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="input mt-1">
            <option value="ta">ta (Tamil)</option>
            <option value="en">en (English)</option>
            <option value="multi">multi</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-400">
          Level
          <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input mt-1">
            <option value="beginner">beginner</option>
            <option value="intermediate">intermediate</option>
            <option value="advanced">advanced</option>
            <option value="">(none)</option>
          </select>
        </label>
        <label className="text-xs font-medium text-ink-400">
          Course (optional)
          <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="input mt-1">
            <option value="">(global)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-ink-400">
          Sort order
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
            className="input mt-1"
          />
        </label>
        <label className="text-xs font-medium text-ink-400 sm:col-span-2">
          Description
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            className="input mt-1"
          />
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? 'Saving…' : '+ Add resource'}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-ink-500">
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Lang</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {resources.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="max-w-64 px-4 py-3">
                  <span className="block truncate font-semibold text-ink-100">{r.title}</span>
                  {r.title_tamil && <span className="block truncate text-xs text-ink-500">{r.title_tamil}</span>}
                  {r.youtube_id && <span className="text-[10px] text-brand-300">▶ embed {r.youtube_id}</span>}
                </td>
                <td className="px-4 py-3 capitalize text-ink-300">{r.type}</td>
                <td className="px-4 py-3 text-ink-300">{r.provider}</td>
                <td className="px-4 py-3 text-ink-300">{r.language}</td>
                <td className="px-4 py-3 capitalize text-ink-300">{r.level ?? '—'}</td>
                <td className="px-4 py-3 text-ink-300">{r.sort_order}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      act(
                        fetch('/api/admin/resources', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ resource_id: r.id, is_published: r.is_published ? 0 : 1 }),
                        }),
                        r.is_published ? 'Unpublished' : 'Published ✓'
                      )
                    }
                    className={`badge cursor-pointer ${r.is_published ? 'border border-brand-400/30 bg-brand-500/15 text-brand-200' : 'border border-white/10 bg-white/5 text-ink-400'}`}
                  >
                    {r.is_published ? 'Published' : 'Hidden'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mr-3 text-xs font-semibold text-brand-300 hover:underline"
                  >
                    Open
                  </a>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm(`Delete "${r.title}"?`)) return;
                      act(
                        fetch('/api/admin/resources', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ resource_id: r.id }),
                        }),
                        'Deleted ✓'
                      );
                    }}
                    className="text-xs font-semibold text-red-300 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
