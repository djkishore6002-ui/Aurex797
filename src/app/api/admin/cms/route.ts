import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit, saveVersion } from '@/lib/audit';
import { getSettings } from '@/lib/cms';
import { indexSource, safeJsonText, blocksToText } from '@/lib/ai/knowledge';

export async function GET() {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const settings = getSettings(db);
    const sections = db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order').all();
    const pages = db.prepare('SELECT * FROM static_pages ORDER BY id').all();
    const faqs = db.prepare('SELECT * FROM faq_entries ORDER BY sort_order').all();
    const nav = db.prepare('SELECT * FROM navigation_items ORDER BY location, sort_order').all();
    const footer = db.prepare('SELECT * FROM footer_links ORDER BY sort_order').all();
    const banners = db.prepare('SELECT * FROM banners ORDER BY sort_order').all();
    return json({ settings, sections, pages, faqs, nav, footer, banners });
  });
}

/**
 * Generic CMS write: { target, ...payload }
 * targets: settings | section | page | faq | nav | footer | banner
 */
export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as Record<string, unknown>;
    const target = z.enum(['settings', 'section', 'page', 'faq', 'nav', 'footer', 'banner']).parse(body.target);
    const db = getDb();
    const action = (body.action as 'create' | 'update' | 'delete' | undefined) ?? 'update';

    switch (target) {
      case 'settings': {
        for (const [k, v] of Object.entries(body)) {
          if (k === 'target' || k === 'action') continue;
          db.prepare('INSERT INTO site_settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(k, JSON.stringify(v));
        }
        audit(admin, 'ADMIN_UPDATED_SITE_SETTINGS', { next: body });
        return json({ ok: true });
      }
      case 'section': {
        if (action === 'create') {
          const res = db
            .prepare('INSERT INTO homepage_sections (key, type, title, subtitle, body_json, sort_order) VALUES (?,?,?,?,?,?)')
            .run(z.string().max(40).parse(body.key), String(body.type ?? 'generic'), (body.title as string) ?? null, (body.body as Record<string, unknown>) ? null : null, JSON.stringify(body.body ?? {}), Number(body.sort_order ?? 99));
          audit(admin, 'ADMIN_CREATED_SECTION', { entity: 'homepage_section', entity_id: Number(res.lastInsertRowid) });
          return json({ ok: true, id: Number(res.lastInsertRowid) }, 201);
        }
        if (action === 'delete') {
          db.prepare('DELETE FROM homepage_sections WHERE id = ?').run(z.number().int().parse(body.id));
          return json({ ok: true });
        }
        const id = z.number().int().parse(body.id);
        const s = db.prepare('SELECT * FROM homepage_sections WHERE id = ?').get(id) as unknown as { id: number; title: string; body_json: string } | undefined;
        if (!s) throw new ApiError(404, 'Section not found');
        const sets: string[] = [];
        const params: (string | number | null)[] = [];
        if (body.title !== undefined) { sets.push('title = ?'); params.push(body.title ? String(body.title) : null); }
        if (body.subtitle !== undefined) { sets.push('subtitle = ?'); params.push(body.subtitle ? String(body.subtitle) : null); }
        if (body.type !== undefined) { sets.push('type = ?'); params.push(String(body.type)); }
        if (body.body !== undefined) { sets.push('body_json = ?'); params.push(JSON.stringify(body.body)); }
        if (body.sort_order !== undefined) { sets.push('sort_order = ?'); params.push(Number(body.sort_order)); }
        if (body.is_published !== undefined) { sets.push('is_published = ?'); params.push(body.is_published ? 1 : 0); }
        if (sets.length) db.prepare(`UPDATE homepage_sections SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).run(...params, id);
        saveVersion('homepage_section', id, body, admin.id);
        audit(admin, 'ADMIN_UPDATED_SECTION', { entity: 'homepage_section', entity_id: id, prev: { title: s.title }, next: body });
        return json({ ok: true });
      }
      case 'page': {
        if (action === 'create') {
          const slug = z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).parse(body.slug);
          const title = z.string().min(2).max(200).parse(body.title);
          if (db.prepare('SELECT id FROM static_pages WHERE slug = ?').get(slug)) throw new ApiError(409, 'A page with this slug exists');
          const res = db.prepare('INSERT INTO static_pages (slug, title, body_json, is_published) VALUES (?,?,?,1)').run(slug, title, JSON.stringify(body.blocks ?? []));
          const pageId = Number(res.lastInsertRowid);
          indexSource(db, 'page', pageId, `Page: ${title}`, blocksToText(body.blocks ?? []));
          audit(admin, 'ADMIN_CREATED_PAGE', { entity: 'static_page', entity_id: pageId, next: { slug, title } });
          return json({ ok: true, id: pageId }, 201);
        }
        if (action === 'delete') {
          const id = z.number().int().parse(body.id);
          db.prepare('DELETE FROM static_pages WHERE id = ?').run(id);
          return json({ ok: true });
        }
        const id = z.number().int().parse(body.id);
        const p = db.prepare('SELECT * FROM static_pages WHERE id = ?').get(id) as unknown as { id: number; title: string; body_json: string } | undefined;
        if (!p) throw new ApiError(404, 'Page not found');
        const title = body.title !== undefined ? z.string().min(2).max(200).parse(body.title) : p.title;
        const published = body.is_published !== undefined ? (body.is_published ? 1 : 0) : 1;
        db.prepare('UPDATE static_pages SET title = ?, body_json = ?, is_published = ?, updated_at = datetime(\'now\') WHERE id = ?').run(title, JSON.stringify(body.blocks ?? safeJsonText(p.body_json)), published, id);
        if (published) indexSource(db, 'page', id, `Page: ${title}`, blocksToText(body.blocks ?? []));
        else indexSource(db, 'page', id, `Page: ${title} (unpublished)`, 'This page is unpublished.');
        saveVersion('static_page', id, { title, blocks: body.blocks }, admin.id);
        audit(admin, 'ADMIN_UPDATED_PAGE', { entity: 'static_page', entity_id: id, prev: { title: p.title }, next: { title, published } });
        return json({ ok: true });
      }
      case 'faq': {
        if (action === 'create') {
          const res = db.prepare('INSERT INTO faq_entries (question, answer, category, sort_order) VALUES (?,?,?,?)').run(
            z.string().min(5).max(300).parse(body.question),
            z.string().min(5).max(4000).parse(body.answer),
            String(body.category ?? 'General'),
            Number(body.sort_order ?? 99)
          );
          const faqId = Number(res.lastInsertRowid);
          const row = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(faqId) as unknown as { question: string; answer: string; category: string };
          indexSource(db, 'faq', faqId, `FAQ: ${row.question}`, `${row.category}\n${row.answer}`);
          audit(admin, 'ADMIN_CREATED_FAQ', { entity: 'faq', entity_id: faqId });
          return json({ ok: true, id: faqId }, 201);
        }
        if (action === 'delete') {
          db.prepare('DELETE FROM faq_entries WHERE id = ?').run(z.number().int().parse(body.id));
          return json({ ok: true });
        }
        const id = z.number().int().parse(body.id);
        const f = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(id) as unknown as { id: number; question: string } | undefined;
        if (!f) throw new ApiError(404, 'FAQ not found');
        db.prepare('UPDATE faq_entries SET question = ?, answer = ?, category = ?, is_published = ? WHERE id = ?').run(
          body.question !== undefined ? z.string().min(5).max(300).parse(body.question) : f.question,
          body.answer !== undefined ? z.string().min(5).max(4000).parse(body.answer) : ((db.prepare('SELECT answer FROM faq_entries WHERE id = ?').get(id) as unknown as { answer: string }).answer),
          body.category !== undefined ? String(body.category) : (db.prepare('SELECT category FROM faq_entries WHERE id = ?').get(id) as unknown as { category: string }).category,
          body.is_published !== undefined ? (body.is_published ? 1 : 0) : 1,
          id
        );
        const row = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(id) as unknown as { question: string; answer: string; category: string };
        indexSource(db, 'faq', id, `FAQ: ${row.question}`, `${row.category}\n${row.answer}`);
        audit(admin, 'ADMIN_UPDATED_FAQ', { entity: 'faq', entity_id: id, prev: { question: f.question }, next: body });
        return json({ ok: true });
      }
      case 'nav': {
        if (action === 'create') {
          db.prepare('INSERT INTO navigation_items (location, label, href, sort_order) VALUES (?,?,?,?)').run(
            z.enum(['header', 'footer', 'mobile']).parse(body.location), z.string().min(1).max(40).parse(body.label), z.string().min(1).max(200).parse(body.href), Number(body.sort_order ?? 99)
          );
          return json({ ok: true }, 201);
        }
        if (action === 'delete') {
          db.prepare('DELETE FROM navigation_items WHERE id = ?').run(z.number().int().parse(body.id));
          return json({ ok: true });
        }
        db.prepare('UPDATE navigation_items SET location = ?, label = ?, href = ?, sort_order = ?, is_published = ? WHERE id = ?').run(
          String(body.location), z.string().min(1).max(40).parse(body.label), z.string().min(1).max(200).parse(body.href), Number(body.sort_order), body.is_published ? 1 : 0, z.number().int().parse(body.id)
        );
        audit(admin, 'ADMIN_UPDATED_NAV', { entity: 'navigation_item', entity_id: Number(body.id), next: body });
        return json({ ok: true });
      }
      case 'footer': {
        if (action === 'create') {
          db.prepare('INSERT INTO footer_links (column_label, label, href, sort_order) VALUES (?,?,?,?)').run(String(body.column_label ?? 'Explore'), z.string().min(1).max(40).parse(body.label), z.string().min(1).max(200).parse(body.href), Number(body.sort_order ?? 99));
          return json({ ok: true }, 201);
        }
        if (action === 'delete') {
          db.prepare('DELETE FROM footer_links WHERE id = ?').run(z.number().int().parse(body.id));
          return json({ ok: true });
        }
        db.prepare('UPDATE footer_links SET column_label = ?, label = ?, href = ?, sort_order = ? WHERE id = ?').run(String(body.column_label), z.string().min(1).max(40).parse(body.label), z.string().min(1).max(200).parse(body.href), Number(body.sort_order), z.number().int().parse(body.id));
        audit(admin, 'ADMIN_UPDATED_FOOTER', { entity: 'footer_link', entity_id: Number(body.id) });
        return json({ ok: true });
      }
      case 'banner': {
        if (action === 'create') {
          db.prepare('INSERT INTO banners (title, body, link_url, link_label, sort_order) VALUES (?,?,?,?,?)').run(z.string().min(3).max(200).parse(body.title), (body.body as string) ?? null, (body.link_url as string) ?? null, (body.link_label as string) ?? null, Number(body.sort_order ?? 99));
          return json({ ok: true }, 201);
        }
        if (action === 'delete') {
          db.prepare('DELETE FROM banners WHERE id = ?').run(z.number().int().parse(body.id));
          return json({ ok: true });
        }
        db.prepare('UPDATE banners SET title = ?, body = ?, link_url = ?, link_label = ?, is_active = ? WHERE id = ?').run(
          z.string().min(3).max(200).parse(body.title), (body.body as string) ?? null, (body.link_url as string) ?? null, (body.link_label as string) ?? null, body.is_active ? 1 : 0, z.number().int().parse(body.id)
        );
        audit(admin, 'ADMIN_UPDATED_BANNER', { entity: 'banner', entity_id: Number(body.id) });
        return json({ ok: true });
      }
    }
  });
}
