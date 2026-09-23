'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface Staff { id: number; name: string }
interface CourseRow {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  difficulty: string;
  level_tag: string | null;
  price_cents: number;
  duration_hours: number;
  instructor_id: number | null;
  organizer_id: number | null;
  is_published: number;
  is_archived: number;
  sort_order: number;
  certificate_enabled: number;
  instructor_name: string | null;
  organizer_name: string | null;
  modules: number;
  published_lessons: number;
}

interface CourseData extends CourseRow {
  modulesData: ModuleData[];
}
interface ModuleData {
  id: number;
  title: string;
  description: string | null;
  sort_order: number;
  is_published: number;
  lessons: LessonData[];
}
interface LessonData {
  id: number;
  slug: string;
  title: string;
  summary: string | null;
  content_json: string;
  video_url: string | null;
  video_duration_seconds: number;
  transcript_text: string | null;
  chapters_json: string | null;
  is_published: number;
  sort_order: number;
}

export function CoursesAdmin({ courses, staff }: { courses: CourseRow[]; staff: Staff[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CourseRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Record<number, CourseData>>({});

  const loadCourse = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/admin/courses/content?course_id=${id}`);
      if (res.ok) {
        const d = await res.json();
        setData((prev) => ({ ...prev, [id]: d }));
      }
    } catch {
      // ignore
    }
  }, []);

  const refresh = () => {
    router.refresh();
    if (expanded) loadCourse(expanded);
  };

  const act = async (c: CourseRow, fields: Record<string, unknown>) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/courses', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: c.id, ...fields }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Action failed');
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        {error && <p role="alert" className="text-sm font-medium text-red-600">{error}</p>}
        <button onClick={() => setCreating(true)} className="btn-primary ml-auto">+ Create course</button>
      </div>

      <div className="space-y-3">
        {courses.map((c) => (
          <div key={c.id} className={`card overflow-hidden ${c.is_archived ? 'opacity-60' : ''}`}>
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button
                onClick={() => {
                  const next = expanded === c.id ? null : c.id;
                  setExpanded(next);
                  if (next && !data[c.id]) loadCourse(c.id);
                }}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label="Toggle course editor"
              >
                {expanded === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-ink-950">{c.title}</p>
                <p className="text-xs text-ink-400">
                  {c.level_tag ?? c.difficulty} · {c.modules} modules · {c.published_lessons} published lessons · {c.price_cents > 0 ? `₹${c.price_cents / 100}` : 'Free'} · {c.instructor_name ?? 'no instructor'}
                </p>
              </div>
              <Badge tone={c.is_published ? 'success' : 'default'}>{c.is_archived ? 'Archived' : c.is_published ? 'Published' : 'Draft'}</Badge>
              <div className="flex gap-1">
                <button onClick={() => act(c, { sort_order: c.sort_order - 1 })} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" title="Move up"><ChevronUp className="h-4 w-4" /></button>
                <button onClick={() => act(c, { sort_order: c.sort_order + 1 })} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100" title="Move down"><ChevronDown className="h-4 w-4" /></button>
                <button onClick={() => act(c, { is_published: c.is_published ? 0 : 1 })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50">
                  {c.is_published ? 'Unpublish' : 'Publish'}
                </button>
                <button onClick={() => act(c, { action: 'duplicate' })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-600 hover:bg-ink-100">Duplicate</button>
                <button onClick={() => act(c, { action: 'archive' })} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 hover:bg-ink-100">Archive</button>
                <button onClick={() => setDeleting(c)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            {expanded === c.id && data[c.id] && (
              <CourseEditor data={data[c.id]} staff={staff} onSaved={refresh} />
            )}
          </div>
        ))}
        {courses.length === 0 && <p className="card p-8 text-center text-sm text-ink-500">No courses yet — create your first one.</p>}
      </div>

      {creating && (
        <CreateCourseDialog
          staff={staff}
          onClose={() => setCreating(false)}
          onDone={() => {
            setCreating(false);
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        title={`Delete “${deleting?.title}”?`}
        body="The course and its modules/lessons are removed from the website. Learner progress rows remain but reference a deleted course. This is a soft delete — recoverable via database."
        confirmLabel="Delete course"
        requireText="DELETE"
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            const res = await fetch('/api/admin/courses', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ course_id: deleting.id }) });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? 'Delete failed');
            setDeleting(null);
            refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Delete failed');
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

/* ── Course detail editor (modules + lessons) ── */
function CourseEditor({ data, staff, onSaved }: { data: CourseData; staff: Staff[]; onSaved: () => void }) {
  const [showNewModule, setShowNewModule] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [editingLesson, setEditingLesson] = useState<LessonData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = async (url: string, method: string, payload?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Request failed');
    return d;
  };

  const addModule = async () => {
    if (!moduleTitle.trim()) return;
    await api('/api/admin/modules', 'POST', { course_id: data.id, title: moduleTitle });
    setModuleTitle('');
    setShowNewModule(false);
    onSaved();
  };

  return (
    <div className="border-t border-ink-100 bg-ink-50/50 px-5 py-5">
      {error && <p role="alert" className="mb-3 text-sm font-medium text-red-600">{error}</p>}

      {/* Course fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label">Subtitle</span>
          <input className="input" defaultValue={data.subtitle ?? ''} onBlur={(e) => api('/api/admin/courses', 'PUT', { course_id: data.id, subtitle: e.target.value || null }).then(onSaved).catch((e2) => setError(e2.message))} />
        </label>
        <label className="text-sm">
          <span className="label">Level tag</span>
          <input className="input" defaultValue={data.level_tag ?? ''} onBlur={(e) => api('/api/admin/courses', 'PUT', { course_id: data.id, level_tag: e.target.value || null }).then(onSaved).catch((e2) => setError(e2.message))} />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="label">Description</span>
          <textarea className="input min-h-[70px]" defaultValue={data.description ?? ''} onBlur={(e) => api('/api/admin/courses', 'PUT', { course_id: data.id, description: e.target.value || null }).then(onSaved).catch((e2) => setError(e2.message))} />
        </label>
        <label className="text-sm">
          <span className="label">Instructor</span>
          <select className="input" defaultValue={data.instructor_id ?? ''} onChange={(e) => api('/api/admin/courses', 'PUT', { course_id: data.id, instructor_id: e.target.value ? Number(e.target.value) : null }).then(onSaved).catch((e2) => setError(e2.message))}>
            <option value="">— none —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="label">Organizer</span>
          <select className="input" defaultValue={data.organizer_id ?? ''} onChange={(e) => api('/api/admin/courses', 'PUT', { course_id: data.id, organizer_id: e.target.value ? Number(e.target.value) : null }).then(onSaved).catch((e2) => setError(e2.message))}>
            <option value="">— none —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>

      {/* Modules */}
      <div className="mt-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-ink-900">Modules & lessons</h3>
          <button onClick={() => setShowNewModule((s) => !s)} className="btn-secondary !py-1.5 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add module
          </button>
        </div>
        {showNewModule && (
          <div className="flex gap-2">
            <input className="input" placeholder="Module title" value={moduleTitle} onChange={(e) => setModuleTitle(e.target.value)} />
            <button onClick={addModule} className="btn-primary shrink-0">Add</button>
          </div>
        )}
        {data.modulesData.map((m) => (
          <ModuleEditor key={m.id} moduleId={m.id} module={m} courseSlug={data.slug} onSaved={onSaved} onEditLesson={(l) => setEditingLesson(l)} onDeleteModule={async () => {
            if (!confirm(`Delete module “${m.title}” and its lessons?`)) return;
            try {
              await api('/api/admin/modules', 'DELETE', { module_id: m.id });
              onSaved();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Delete failed');
            }
          }} />
        ))}
        {data.modulesData.length === 0 && <p className="text-sm text-ink-500">No modules yet.</p>}
      </div>

      {editingLesson && (
        <LessonEditor lesson={editingLesson} courseSlug={data.slug} onClose={() => { setEditingLesson(null); onSaved(); }} />
      )}
    </div>
  );
}

function ModuleEditor({ moduleId, module, courseSlug, onSaved, onEditLesson, onDeleteModule }: { moduleId: number; module: ModuleData; courseSlug: string; onSaved: () => void; onEditLesson: (l: LessonData) => void; onDeleteModule: () => void }) {
  const [showNewLesson, setShowNewLesson] = useState(false);
  const [title, setTitle] = useState('');

  const api = async (url: string, method: string, payload?: unknown) => {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: payload ? JSON.stringify(payload) : undefined });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error ?? 'Request failed');
    return d;
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-white">
      <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3">
        <input
          className="min-w-0 flex-1 border-none bg-transparent font-semibold outline-none"
          defaultValue={module.title}
          onBlur={(e) => api('/api/admin/modules', 'PUT', { module_id: moduleId, title: e.target.value }).then(onSaved).catch(() => undefined)}
          aria-label="Module title"
        />
        <span className="text-xs text-ink-400">{module.lessons.length} lessons</span>
        <button
          onClick={() => api('/api/admin/modules', 'PUT', { module_id: moduleId, is_published: module.is_published ? 0 : 1 }).then(onSaved)}
          className="badge"
          style={{ cursor: 'pointer' }}
        >
          {module.is_published ? '✓ published' : 'draft'}
        </button>
        <button onClick={() => setShowNewLesson((s) => !s)} className="rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50">
          + Lesson
        </button>
        <button onClick={onDeleteModule} className="rounded-lg p-1 text-red-500 hover:bg-red-50" title="Delete module"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {showNewLesson && (
        <div className="flex gap-2 border-b border-ink-100 px-4 py-3">
          <input className="input" placeholder="Lesson title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button
            onClick={async () => {
              if (!title.trim()) return;
              await api('/api/admin/lessons', 'POST', { module_id: moduleId, title, blocks: [{ type: 'paragraph', data: { text: 'Start writing your lesson here.' } }] });
              setTitle('');
              setShowNewLesson(false);
              onSaved();
            }}
            className="btn-primary shrink-0"
          >
            Create
          </button>
        </div>
      )}
      <ul>
        {module.lessons.map((l) => (
          <li key={l.id} className="flex items-center gap-3 border-b border-ink-50 px-4 py-2.5 last:border-b-0">
            <button onClick={() => onEditLesson(l)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium text-ink-800 hover:text-brand-800">
              <Pencil className="h-3.5 w-3.5 shrink-0 text-ink-300" />
              <span className="truncate">{l.title}</span>
              {l.video_url && <span title="Video lesson">🎬</span>}
            </button>
            <a href={`/learn/${courseSlug}/${l.slug}`} target="_blank" rel="noreferrer" className="text-xs text-ink-400 hover:text-brand-700">View</a>
            <button onClick={async () => { await api('/api/admin/lessons', 'PUT', { lesson_id: l.id, is_published: l.is_published ? 0 : 1 }); onSaved(); }} className={`badge ${l.is_published ? 'bg-brand-100 text-brand-800' : 'bg-ink-100 text-ink-500'}`} style={{ cursor: 'pointer' }}>
              {l.is_published ? 'published' : 'draft'}
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete lesson “${l.title}”?`)) return;
                await api('/api/admin/lessons', 'DELETE', { lesson_id: l.id });
                onSaved();
              }}
              className="rounded-lg p-1 text-red-500 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
        {module.lessons.length === 0 && <li className="px-4 py-3 text-sm text-ink-400">No lessons in this module.</li>}
      </ul>
    </div>
  );
}

/* ── Lesson editor with block editor ── */
const BLOCK_TYPES = [
  { type: 'heading', label: 'Heading' },
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'vocabulary', label: 'Vocabulary' },
  { type: 'grammar', label: 'Grammar' },
  { type: 'callout', label: 'Callout' },
  { type: 'quote', label: 'Quote' },
  { type: 'list', label: 'List' },
  { type: 'table', label: 'Table' },
];

function LessonEditor({ lesson, courseSlug, onClose }: { lesson: LessonData; courseSlug: string; onClose: () => void }) {
  const [form, setForm] = useState({
    title: lesson.title,
    summary: lesson.summary ?? '',
    video_url: lesson.video_url ?? '',
    video_duration_seconds: lesson.video_duration_seconds,
    transcript_text: lesson.transcript_text ?? '',
  });
  const [blocks, setBlocks] = useState<{ type: string; data: Record<string, unknown> }[]>(() => {
    try {
      return JSON.parse(lesson.content_json || '[]');
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      // auto-save on change (debounced) — real persistence, no "save" button lost
      save(true);
    }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, blocks]);

  const save = async (final = false) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lesson.id,
          title: form.title,
          summary: form.summary || null,
          video_url: form.video_url || null,
          video_duration_seconds: Number(form.video_duration_seconds) || 0,
          transcript_text: form.transcript_text || null,
          blocks,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Save failed');
      if (final) onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const setBlock = (i: number, patch: Record<string, unknown>) => setBlocks((bs) => bs.map((b, bi) => (bi === i ? { ...b, data: { ...b.data, ...patch } } : b)));
  const removeBlock = (i: number) => setBlocks((bs) => bs.filter((_, bi) => bi !== i));
  const addBlock = (type: string) => {
    const defaults: Record<string, Record<string, unknown>> = {
      heading: { text: 'New heading' },
      paragraph: { text: 'New paragraph…' },
      vocabulary: { tamil: 'தேநீர்', transliteration: 'theenir', meaning: 'Tea' },
      grammar: { title: 'Grammar point', explanation: 'Explain the rule…', example: 'Example sentence' },
      callout: { tone: 'tip', text: 'A helpful tip' },
      quote: { text: 'A quote in Tamil…' },
      list: { items: ['First item', 'Second item'] },
      table: { rows: [['Col A', 'Col B'], ['Value 1', 'Value 2']] },
    };
    setBlocks((bs) => [...bs, { type, data: defaults[type] ?? { text: '' } }]);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <div className="my-4 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Edit lesson</h3>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            {busy && <span>Auto-saving…</span>}
            {error && <span className="font-medium text-red-600">{error}</span>}
            <a href={`/learn/${courseSlug}/${lesson.slug}`} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">View page ↗</a>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <input className="input font-semibold" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} aria-label="Lesson title" />
          <input className="input" placeholder="Summary (shows in course list)" value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} aria-label="Lesson summary" />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm sm:col-span-2">
              <span className="label">Video URL (mp4/webm)</span>
              <input className="input font-mono text-xs" placeholder="https://…" value={form.video_url} onChange={(e) => setForm((f) => ({ ...f, video_url: e.target.value }))} />
            </label>
            <label className="text-sm">
              <span className="label">Duration (sec)</span>
              <input className="input" type="number" min={0} value={form.video_duration_seconds} onChange={(e) => setForm((f) => ({ ...f, video_duration_seconds: Number(e.target.value) }))} />
            </label>
          </div>
          <label className="text-sm">
            <span className="label">Transcript</span>
            <textarea className="input min-h-[60px]" value={form.transcript_text} onChange={(e) => setForm((f) => ({ ...f, transcript_text: e.target.value }))} />
          </label>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-ink-900">Content blocks:</span>
              {BLOCK_TYPES.map((b) => (
                <button key={b.type} onClick={() => addBlock(b.type)} className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 hover:bg-ink-50">
                  + {b.label}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {blocks.map((b, i) => (
                <div key={i} className="rounded-xl border border-ink-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge>{b.type}</Badge>
                    <button onClick={() => removeBlock(i)} className="rounded p-1 text-red-500 hover:bg-red-50" aria-label="Remove block"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                  <BlockFields block={b} onChange={(p) => setBlock(i, p)} />
                </div>
              ))}
              {blocks.length === 0 && <p className="text-sm text-ink-400">No blocks yet — add content above.</p>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Done (auto-saved)</button>
          <button onClick={() => save(true)} disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save & close'}</button>
        </div>
      </div>
    </div>
  );
}

function BlockFields({ block, onChange }: { block: { type: string; data: Record<string, unknown> }; onChange: (patch: Record<string, unknown>) => void }) {
  const d = block.data;
  const inp = 'input !py-1.5 text-sm';
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
      return (
        <div className="space-y-2">
          {block.type === 'callout' && (
            <select className="input !py-1.5 text-sm w-40" value={String(d.tone ?? 'tip')} onChange={(e) => onChange({ tone: e.target.value })}>
              {['tip', 'info', 'warning'].map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
          <textarea className={`${inp} min-h-[50px]`} value={String(d.text ?? '')} onChange={(e) => onChange({ text: e.target.value })} />
        </div>
      );
    case 'vocabulary':
      return (
        <div className="grid gap-2 sm:grid-cols-3">
          <input className="input !py-1.5 text-sm tamil" placeholder="தமிழ்" value={String(d.tamil ?? '')} onChange={(e) => onChange({ tamil: e.target.value })} />
          <input className="input !py-1.5 text-sm" placeholder="Transliteration" value={String(d.transliteration ?? '')} onChange={(e) => onChange({ transliteration: e.target.value })} />
          <input className="input !py-1.5 text-sm" placeholder="Meaning" value={String(d.meaning ?? '')} onChange={(e) => onChange({ meaning: e.target.value })} />
        </div>
      );
    case 'grammar':
      return (
        <div className="space-y-2">
          <input className="input !py-1.5 text-sm" placeholder="Grammar point title" value={String(d.title ?? '')} onChange={(e) => onChange({ title: e.target.value })} />
          <textarea className="input !py-1.5 text-sm min-h-[50px]" placeholder="Explanation" value={String(d.explanation ?? '')} onChange={(e) => onChange({ explanation: e.target.value })} />
          <textarea className="input !py-1.5 text-sm min-h-[40px] tamil" placeholder="Example sentence" value={String(d.example ?? '')} onChange={(e) => onChange({ example: e.target.value })} />
        </div>
      );
    case 'list': {
      const items = Array.isArray(d.items) ? (d.items as string[]) : [];
      return (
        <div className="space-y-1.5">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className="input !py-1.5 text-sm" value={it} onChange={(e) => onChange({ items: items.map((x, xi) => (xi === i ? e.target.value : x)) })} />
              <button onClick={() => onChange({ items: items.filter((_, xi) => xi !== i) })} className="text-red-500" aria-label="Remove item"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ items: [...items, 'New item'] })} className="text-xs font-semibold text-brand-700">+ Add item</button>
        </div>
      );
    }
    case 'table': {
      const rows = Array.isArray(d.rows) ? (d.rows as string[][]) : [];
      return (
        <div className="space-y-1.5">
          {rows.map((r, ri) => (
            <div key={ri} className="flex flex-wrap gap-1.5">
              {r.map((cell, ci) => (
                <input key={ci} className="input !py-1 text-xs flex-1 min-w-[90px]" value={cell} onChange={(e) => onChange({ rows: rows.map((row, xi) => (xi === ri ? row.map((c, xci) => (xci === ci ? e.target.value : c)) : row)) })} />
              ))}
              <button onClick={() => onChange({ rows: rows.filter((_, xi) => xi !== ri) })} className="text-red-500" aria-label="Remove row"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ rows: [...rows, ['Cell A', 'Cell B']] })} className="text-xs font-semibold text-brand-700">+ Add row</button>
        </div>
      );
    }
    default:
      return <input className="input !py-1.5 text-sm" value={String(d.text ?? '')} onChange={(e) => onChange({ text: e.target.value })} />;
  }
}

function CreateCourseDialog({ staff, onClose, onDone }: { staff: Staff[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', difficulty: 'beginner', level_tag: '', instructor_id: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/50 p-4" role="dialog" aria-modal="true">
      <form
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const res = await fetch('/api/admin/courses', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...form, instructor_id: form.instructor_id ? Number(form.instructor_id) : null }),
            });
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? 'Create failed');
            onDone();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Create failed');
            setBusy(false);
          }
        }}
      >
        <h3 className="font-bold">Create course</h3>
        {error && <p role="alert" className="mt-2 text-sm font-medium text-red-600">{error}</p>}
        <div className="mt-4 space-y-3">
          <input className="input" placeholder="Course title" required minLength={3} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="input" placeholder="Subtitle" value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
          <textarea className="input min-h-[80px]" placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <select className="input" value={form.difficulty} onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}>
              {['beginner', 'intermediate', 'advanced'].map((d) => <option key={d}>{d}</option>)}
            </select>
            <input className="input" placeholder="Level tag (e.g. Level 1 — Absolute Beginner)" value={form.level_tag} onChange={(e) => setForm((f) => ({ ...f, level_tag: e.target.value }))} />
          </div>
          <select className="input" value={form.instructor_id} onChange={(e) => setForm((f) => ({ ...f, instructor_id: e.target.value }))}>
            <option value="">— no instructor —</option>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create course'}</button>
        </div>
      </form>
    </div>
  );
}
