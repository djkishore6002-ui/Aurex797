'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { Badge, ErrorBanner } from '@/components/ui';

interface Props {
  settings: Record<string, unknown>;
  sections: { id: number; key: string; type: string; title: string | null; body: Record<string, unknown>; is_published: number }[];
  faqs: { id: number; question: string; answer: string; category: string; is_published: number }[];
  nav: { id: number; label: string; href: string }[];
  footer: { id: number; column_label: string; label: string; href: string }[];
  banners: { id: number; title: string; body: string | null; link_url: string | null; link_label: string | null; is_active: number }[];
  pages: { id: number; slug: string; title: string; is_published: boolean; blocks: unknown }[];
}

const TABS = ['Site text', 'Homepage', 'Pages', 'FAQ', 'Navigation', 'Banners'] as const;

export function CmsAdmin(props: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Site text');
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const refresh = () => router.refresh();

  const put = async (payload: Record<string, unknown>, silent = false) => {
    setError(null);
    try {
      const res = await fetch('/api/admin/cms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Save failed');
      if (!silent) refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === t ? 'bg-brand-700 text-white' : 'bg-white text-ink-600 border border-ink-200 hover:bg-ink-50'}`}>
            {t}
          </button>
        ))}
      </div>
      {error && <div className="mb-4"><ErrorBanner error={error} /></div>}

      {tab === 'Site text' && <SiteTextTab settings={props.settings} put={put} />}
      {tab === 'Homepage' && <HomepageTab sections={props.sections} put={put} />}
      {tab === 'Pages' && <PagesTab pages={props.pages} put={put} />}
      {tab === 'FAQ' && <FaqTab faqs={props.faqs} put={put} />}
      {tab === 'Navigation' && <NavTab nav={props.nav} footer={props.footer} put={put} />}
      {tab === 'Banners' && <BannersTab banners={props.banners} put={put} />}
    </div>
  );
}

function SiteTextTab({ settings, put }: { settings: Record<string, unknown>; put: (p: Record<string, unknown>) => void }) {
  const keys: [string, string, string][] = [
    ['site_name', 'Site name', 'short'],
    ['tagline', 'Tagline (Tamil + English)', 'short'],
    ['description', 'Description (footer/SEO)', 'long'],
    ['contact_email', 'Contact email', 'short'],
    ['hero_title', 'Hero title', 'short'],
    ['hero_subtitle', 'Hero subtitle', 'long'],
    ['hero_cta_label', 'Hero button label', 'short'],
    ['hero_cta_href', 'Hero button link', 'short'],
  ];
  return (
    <div className="card space-y-4 p-6">
      <p className="text-sm text-ink-500">Changes save on blur and appear on the live site immediately.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {keys.map(([key, label, kind]) => (
          <label key={key} className={`text-sm ${kind === 'long' ? 'sm:col-span-2' : ''}`}>
            <span className="label">{label}</span>
            {kind === 'long' ? (
              <textarea className="input min-h-[70px]" defaultValue={String(settings[key] ?? '')} onBlur={(e) => put({ target: 'settings', [key]: e.target.value })} />
            ) : (
              <input className="input" defaultValue={String(settings[key] ?? '')} onBlur={(e) => put({ target: 'settings', [key]: e.target.value })} />
            )}
          </label>
        ))}
      </div>
    </div>
  );
}

function HomepageTab({ sections, put }: { sections: Props['sections']; put: (p: Record<string, unknown>) => void }) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <div key={s.id} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{s.type}</Badge>
            <input
              className="min-w-0 flex-1 border-b border-dashed border-ink-200 bg-transparent font-semibold"
              defaultValue={s.title ?? ''}
              placeholder="Section title (leave empty for stats/quote)"
              onBlur={(e) => put({ target: 'section', id: s.id, title: e.target.value || null })}
              aria-label="Section title"
            />
            <span className="text-xs text-ink-400">{s.is_published ? '✓ published' : 'hidden'}</span>
            <button
              onClick={async () => {
                await put({ target: 'section', id: s.id, is_published: s.is_published ? 0 : 1 });
                router.refresh();
              }}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              {s.is_published ? 'Hide' : 'Show'}
            </button>
            <button onClick={() => router.refresh()} className="hidden" />
          </div>
          <SectionBodyEditor sectionId={s.id} body={s.body} onSaved={() => router.refresh()} />
        </div>
      ))}
    </div>
  );
}

function SectionBodyEditor({ sectionId, body, onSaved }: { sectionId: number; body: Record<string, unknown>; onSaved: () => void }) {
  const items = (body.items as Record<string, string>[] | undefined) ?? [];
  const [text, setText] = useState(JSON.stringify(items, null, 2));
  const [err, setErr] = useState<string | null>(null);

  const save = () => {
    setErr(null);
    try {
      const parsed = JSON.parse(text);
      fetch('/api/admin/cms', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target: 'section', id: sectionId, body: { items: parsed } }) })
        .then((r) => r.json())
        .then((d) => {
          if (!d.ok) throw new Error(d.error ?? 'Save failed');
          onSaved();
        })
        .catch((e) => setErr(e instanceof Error ? e.message : 'Save failed'));
    } catch (e) {
      setErr('Invalid JSON — fix the syntax above');
    }
  };

  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-400">Content (JSON: items with label/value/text/icon fields per section type)</p>
      <textarea className="input min-h-[110px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} />
      {err && <p className="mt-1 text-xs font-medium text-red-600">{err}</p>}
      <button onClick={save} className="btn-secondary mt-2 !py-1.5 text-xs">Save section content</button>
    </div>
  );
}

function PagesTab({ pages, put }: { pages: Props['pages']; put: (p: Record<string, unknown>) => void }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '' });
  const [editing, setEditing] = useState<Props['pages'][number] | null>(null);
  const [blocksText, setBlocksText] = useState('');
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="btn-secondary !py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> New page</button>
      </div>
      {pages.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{p.title} <span className="text-xs font-normal text-ink-400">/{p.slug}</span></p>
          </div>
          <Badge tone={p.is_published ? 'success' : 'default'}>{p.is_published ? 'published' : 'draft'}</Badge>
          <a href={`/${p.slug}`} target="_blank" rel="noreferrer" className="text-xs text-ink-400 hover:text-brand-700">View ↗</a>
          <button onClick={() => { setEditing(p); setBlocksText(JSON.stringify(p.blocks ?? [], null, 2)); }} className="text-xs font-semibold text-brand-700 hover:underline">Edit</button>
          <button onClick={() => put({ target: 'page', id: p.id, is_published: p.is_published ? 0 : 1 })} className="text-xs font-semibold text-ink-500 hover:underline">
            {p.is_published ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={() => { if (confirm(`Delete page “${p.slug}”?`)) put({ target: 'page', id: p.id, action: 'delete' }); }} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}

      {showNew && (
        <div className="card flex flex-wrap items-end gap-3 p-4">
          <label className="text-sm"><span className="label">Slug (a-z, -)</span><input className="input w-44" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} /></label>
          <label className="text-sm"><span className="label">Title</span><input className="input w-64" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} /></label>
          <button
            onClick={async () => {
              await put({ target: 'page', action: 'create', slug: form.slug, title: form.title, blocks: [] });
              setShowNew(false);
              setForm({ slug: '', title: '' });
              router.refresh();
            }}
            className="btn-primary !py-2 text-xs"
          >
            Create
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4" role="dialog" aria-modal="true">
          <div className="my-4 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="font-bold">Edit page: {editing.title}</h3>
            <p className="mt-1 text-xs text-ink-400">Content blocks JSON: heading / paragraph / list / callout / quote / table. Save, then publish.</p>
            <textarea className="input mt-3 min-h-[300px] font-mono text-xs" value={blocksText} onChange={(e) => setBlocksText(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setEditing(null)} className="btn-secondary">Close</button>
              <button
                onClick={async () => {
                  let blocks: unknown = [];
                  try { blocks = JSON.parse(blocksText); } catch { alert('Invalid JSON'); return; }
                  await put({ target: 'page', id: editing.id, title: editing.title, blocks, is_published: 1 });
                  setEditing(null);
                  router.refresh();
                }}
                className="btn-primary"
              >
                Save & publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FaqTab({ faqs, put }: { faqs: Props['faqs']; put: (p: Record<string, unknown>) => void }) {
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ question: '', answer: '', category: 'General' });
  const router = useRouter();

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowNew(true)} className="btn-secondary !py-1.5 text-xs"><Plus className="h-3.5 w-3.5" /> Add FAQ</button>
      </div>
      {faqs.map((f) => (
        <div key={f.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 font-semibold">{f.question}</p>
            <Badge>{f.category}</Badge>
            <button onClick={() => put({ target: 'faq', id: f.id, is_published: f.is_published ? 0 : 1 })} className="text-xs font-semibold text-brand-700 hover:underline">
              {f.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <button onClick={() => { if (confirm('Delete this FAQ?')) put({ target: 'faq', id: f.id, action: 'delete' }); }} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
          <p className="mt-2 line-clamp-2 text-sm text-ink-500">{f.answer}</p>
        </div>
      ))}
      {showNew && (
        <div className="card space-y-3 p-4">
          <input className="input" placeholder="Question" value={form.question} onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))} />
          <textarea className="input min-h-[70px]" placeholder="Answer" value={form.answer} onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value }))} />
          <div className="flex gap-2">
            <input className="input w-44" placeholder="Category" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
            <button
              onClick={async () => {
                await put({ target: 'faq', action: 'create', ...form });
                setShowNew(false);
                setForm({ question: '', answer: '', category: 'General' });
                router.refresh();
              }}
              className="btn-primary"
            >
              Add FAQ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function NavTab({ nav, footer, put }: { nav: Props['nav']; footer: Props['footer']; put: (p: Record<string, unknown>) => void }) {
  const [newLabel, setNewLabel] = useState('');
  const [newHref, setNewHref] = useState('');
  const router = useRouter();
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="card p-5">
        <h3 className="font-bold">Header navigation</h3>
        <ul className="mt-3 space-y-1.5">
          {nav.map((n) => (
            <li key={n.id} className="flex items-center gap-2 text-sm">
              <input className="input !py-1 flex-1" defaultValue={n.label} onBlur={(e) => put({ target: 'nav', id: n.id, location: 'header', label: e.target.value, href: n.href })} />
              <input className="input !py-1 w-32" defaultValue={n.href} onBlur={(e) => put({ target: 'nav', id: n.id, location: 'header', label: n.label, href: e.target.value })} />
              <button onClick={() => put({ target: 'nav', id: n.id, action: 'delete' })} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input className="input !py-1.5" placeholder="Label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
          <input className="input !py-1.5 w-32" placeholder="/href" value={newHref} onChange={(e) => setNewHref(e.target.value)} />
          <button
            onClick={async () => {
              if (!newLabel || !newHref) return;
              await put({ target: 'nav', action: 'create', location: 'header', label: newLabel, href: newHref });
              setNewLabel(''); setNewHref('');
              router.refresh();
            }}
            className="btn-secondary !py-1.5 text-xs"
          >
            Add
          </button>
        </div>
      </div>
      <div className="card p-5">
        <h3 className="font-bold">Footer links</h3>
        <ul className="mt-3 space-y-1.5">
          {footer.map((n) => (
            <li key={n.id} className="flex items-center gap-2 text-sm">
              <span className="w-20 shrink-0 text-xs text-ink-400">{n.column_label}</span>
              <input className="input !py-1 flex-1" defaultValue={n.label} onBlur={(e) => put({ target: 'footer', id: n.id, column_label: n.column_label, label: e.target.value, href: n.href })} />
              <input className="input !py-1 w-32" defaultValue={n.href} onBlur={(e) => put({ target: 'footer', id: n.id, column_label: n.column_label, label: n.label, href: e.target.value })} />
              <button onClick={() => put({ target: 'footer', id: n.id, action: 'delete' })} className="text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function BannersTab({ banners, put }: { banners: Props['banners']; put: (p: Record<string, unknown>) => void }) {
  const [form, setForm] = useState({ title: '', body: '', link_url: '', link_label: '' });
  const router = useRouter();
  return (
    <div className="space-y-3">
      {banners.map((b) => (
        <div key={b.id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{b.title}</p>
            <p className="text-xs text-ink-400">{b.body}</p>
          </div>
          <Badge tone={b.is_active ? 'success' : 'default'}>{b.is_active ? 'active' : 'off'}</Badge>
          <button onClick={() => put({ target: 'banner', id: b.id, title: b.title, body: b.body ?? '', link_url: b.link_url ?? '', link_label: b.link_label ?? '', is_active: b.is_active ? 0 : 1 })} className="text-xs font-semibold text-brand-700 hover:underline">
            {b.is_active ? 'Disable' : 'Enable'}
          </button>
          <button onClick={() => { if (confirm('Delete banner?')) put({ target: 'banner', id: b.id, action: 'delete' }); }} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <div className="card space-y-3 p-4">
        <h3 className="font-bold">Add banner</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className="input" placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="input" placeholder="Body" value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
          <input className="input" placeholder="Link URL" value={form.link_url} onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))} />
          <input className="input" placeholder="Link label" value={form.link_label} onChange={(e) => setForm((f) => ({ ...f, link_label: e.target.value }))} />
        </div>
        <button
          onClick={async () => {
            if (!form.title) return;
            await put({ target: 'banner', action: 'create', ...form });
            setForm({ title: '', body: '', link_url: '', link_label: '' });
            router.refresh();
          }}
          className="btn-primary !py-2 text-xs"
        >
          Add banner
        </button>
      </div>
    </div>
  );
}
