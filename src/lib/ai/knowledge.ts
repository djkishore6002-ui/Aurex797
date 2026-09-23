import type { DB } from '@/db';
import { tx } from '@/db';
import { getDb } from '@/db';
import type { RetrievedChunk } from './provider';

/* ─────────────────────────────────────────────────────────────
   RAG knowledge pipeline:  CMS content → chunking → knowledge
   store → retrieval (BM25). The `embedding` column is reserved
   for a vector-store upgrade (see README → AI architecture).
   ───────────────────────────────────────────────────────────── */

const CHUNK_SIZE = 700;
const CHUNK_OVERLAP = 120;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(i + CHUNK_SIZE, clean.length);
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastSpace > i + 200) end = lastSpace;
    }
    chunks.push(clean.slice(i, end));
    if (end >= clean.length) break;
    i = end - CHUNK_OVERLAP;
    if (i < 0) i = 0;
  }
  return chunks;
}

/** Upsert a knowledge document: replaces chunks, marks current. */
export function indexSource(db: DB, sourceType: string, sourceId: number, title: string, text: string): void {
  const content = `${title}\n\n${text}`.trim();
  const existing = db.prepare('SELECT id FROM ai_knowledge_documents WHERE source_type = ? AND source_id = ?').get(sourceType, sourceId) as unknown as { id: number } | undefined;
  if (!content || content.length < 20) {
    // Too small to be useful — drop any existing doc
    if (existing) db.prepare('DELETE FROM ai_knowledge_documents WHERE id = ?').run(existing.id);
    invalidateCache();
    return;
  }
  let docId: number;
  if (existing) {
    docId = existing.id;
    db.prepare("UPDATE ai_knowledge_documents SET title=?, content_text=?, status='current', indexed_at=datetime('now'), updated_at=datetime('now') WHERE id=?").run(title, content, docId);
    db.prepare('DELETE FROM ai_knowledge_chunks WHERE document_id = ?').run(docId);
  } else {
    const res = db
      .prepare("INSERT INTO ai_knowledge_documents (source_type, source_id, title, content_text, status, indexed_at) VALUES (?,?,?,?,'current',datetime('now'))")
      .run(sourceType, sourceId, title, content);
    docId = Number(res.lastInsertRowid);
  }
  const insert = db.prepare('INSERT INTO ai_knowledge_chunks (document_id, chunk_index, content, tokens) VALUES (?,?,?,?)');
  const chunks = chunkText(content);
  tx(db, () => {
    for (let idx = 0; idx < chunks.length; idx++) {
      insert.run(docId, idx, chunks[idx], Math.ceil(chunks[idx].length / 4));
    }
  });
  invalidateCache();
}

export function markStale(db: DB, sourceType: string, sourceId: number): void {
  db.prepare("UPDATE ai_knowledge_documents SET status='stale', updated_at=datetime('now') WHERE source_type=? AND source_id=?").run(sourceType, sourceId);
  invalidateCache();
}

export function removeSource(db: DB, sourceType: string, sourceId: number): void {
  db.prepare('DELETE FROM ai_knowledge_documents WHERE source_type=? AND source_id=?').run(sourceType, sourceId);
  invalidateCache();
}

/* ── Text extraction helpers (blocks → plain text) ── */
export function blocksToText(blocks: unknown): string {
  if (!Array.isArray(blocks)) return '';
  const parts: string[] = [];
  for (const b of blocks as { type: string; data: Record<string, unknown> }[]) {
    const d = b.data || {};
    switch (b.type) {
      case 'heading':
        parts.push(String(d.text ?? ''));
        break;
      case 'paragraph':
        parts.push(String(d.text ?? ''));
        break;
      case 'vocabulary':
        parts.push(`Vocabulary: ${d.tamil ?? ''} (${d.transliteration ?? ''}) — ${d.meaning ?? ''}`);
        break;
      case 'quote':
        parts.push(String(d.text ?? ''));
        break;
      case 'callout':
        parts.push(String(d.text ?? ''));
        break;
      case 'table':
        if (Array.isArray(d.rows)) parts.push((d.rows as string[][]).map((r) => r.join(' | ')).join('\n'));
        break;
      case 'list':
        if (Array.isArray(d.items)) parts.push((d.items as string[]).join('. '));
        break;
      case 'grammar':
        parts.push(`Grammar: ${d.title ?? ''} — ${d.explanation ?? ''} Example: ${d.example ?? ''}`);
        break;
      default:
        break;
    }
  }
  return parts.filter(Boolean).join('\n');
}

/* ── BM25-ish retrieval (works fully offline; vector-upgrade ready) ── */
interface CachedChunk {
  id: number;
  docId: number;
  title: string;
  source_type: string;
  source_id: number;
  content: string;
  tokens: Map<string, number>;
  length: number;
}

let _cache: CachedChunk[] | null = null;
function invalidateCache() {
  _cache = null;
}

const TOKEN_RE = /[a-zA-Z][a-zA-Z0-9']*|[\u0B80-\u0BFF]+/g;
export function tokenize(text: string): string[] {
  const out: string[] = [];
  const matches = text.toLowerCase().match(TOKEN_RE);
  if (matches) {
    for (const m of matches) {
      if (m.length <= 20) out.push(m);
      // Tamil agglutinative words: also index prefixes to improve recall
      if (/^[\u0B80-\u0BFF]+$/.test(m) && m.length > 4) out.push(m.slice(0, Math.ceil(m.length / 2)));
    }
  }
  return out;
}

function loadChunks(db: DB): CachedChunk[] {
  if (_cache) return _cache;
  const rows = db
    .prepare(
      `SELECT c.id, c.document_id, c.content, d.title, d.source_type, d.source_id
       FROM ai_knowledge_chunks c JOIN ai_knowledge_documents d ON d.id = c.document_id
       WHERE d.status = 'current'`
    )
    .all() as unknown as { id: number; document_id: number; content: string; title: string; source_type: string; source_id: number }[];
  _cache = rows.map((r) => {
    const tokens = tokenize(`${r.title} ${r.content}`);
    const map = new Map<string, number>();
    for (const t of tokens) map.set(t, (map.get(t) ?? 0) + 1);
    return { id: r.id, docId: r.document_id, title: r.title, source_type: r.source_type, source_id: r.source_id, content: r.content, tokens: map, length: tokens.length };
  });
  return _cache;
}

export function retrieve(db: DB, query: string, k = 5, filter?: (c: CachedChunk) => boolean): RetrievedChunk[] {
  const chunks = loadChunks(db);
  if (!chunks.length) return [];
  const qTokens = tokenize(query).filter((t) => t.length > 1);
  if (!qTokens.length) return [];
  const N = chunks.length;
  const df = new Map<string, number>();
  for (const t of new Set(qTokens)) {
    let count = 0;
    for (const c of chunks) if (c.tokens.has(t)) count++;
    df.set(t, count);
  }
  const avgLen = chunks.reduce((a, c) => a + c.length, 0) / N || 1;
  const k1 = 1.5;
  const b = 0.75;
  const scored: RetrievedChunk[] = [];
  for (const c of chunks) {
    if (filter && !filter(c)) continue;
    let score = 0;
    for (const t of new Set(qTokens)) {
      const tf = c.tokens.get(t) ?? 0;
      if (!tf) continue;
      const n = df.get(t) ?? 0;
      if (n === 0) continue;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (c.length / avgLen))));
    }
    if (score > 0.3) scored.push({ content: c.content, title: c.title, source_type: c.source_type, source_id: c.source_id, score: Math.round(score * 100) / 100 });
  }
  scored.sort((a, b2) => b2.score - a.score);
  return scored.slice(0, k);
}

/* ── Reindexing the whole platform ── */
export function reindexAll(db: DB = getDb()): { documents: number; chunks: number } {
  db.prepare("UPDATE ai_knowledge_documents SET status='stale'").run();

  // Courses
  for (const c of db.prepare('SELECT * FROM courses WHERE is_published = 1 AND deleted_at IS NULL').all() as unknown as { id: number; title: string; subtitle: string; description: string; level_tag: string; difficulty: string }[]) {
    indexSource(db, 'course', c.id, `Course: ${c.title}`, `${c.subtitle ?? ''}\n${c.level_tag ?? ''} (${c.difficulty})\n${c.description ?? ''}`);
  }
  // Lessons (with module + course titles)
  for (const l of db
    .prepare(
      `SELECT l.*, m.title AS module_title, c.title AS course_title
       FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
       WHERE l.is_published = 1`
    )
    .all() as unknown as { id: number; title: string; summary: string; content_json: string; transcript_text: string; module_title: string; course_title: string; slug: string }[]) {
    const blocks = safeJson(l.content_json);
    const text = [l.summary ?? '', blocksToText(blocks), l.transcript_text ?? ''].filter(Boolean).join('\n');
    indexSource(db, 'lesson', l.id, `Lesson: ${l.title} (${l.course_title} → ${l.module_title})`, text);
  }
  // FAQ
  for (const f of db.prepare('SELECT * FROM faq_entries WHERE is_published = 1').all() as unknown as { id: number; question: string; answer: string; category: string }[]) {
    indexSource(db, 'faq', f.id, `FAQ: ${f.question}`, `${f.category}\n${f.answer}`);
  }
  // Static pages
  for (const p of db.prepare('SELECT * FROM static_pages WHERE is_published = 1').all() as unknown as { id: number; slug: string; title: string; body_json: string }[]) {
    indexSource(db, 'page', p.id, `Page: ${p.title}`, blocksToText(safeJson(p.body_json)));
  }
  // Workshops
  for (const w of db.prepare('SELECT * FROM workshops WHERE is_published = 1 AND deleted_at IS NULL').all() as unknown as { id: number; title: string; description: string }[]) {
    const sessions = (db.prepare('SELECT title, starts_at, duration_minutes FROM workshop_sessions WHERE workshop_id = ?').all(w.id) as unknown as { title: string; starts_at: string; duration_minutes: number }[])
      .map((s) => `Session: ${s.title} on ${s.starts_at} UTC for ${s.duration_minutes} minutes`)
      .join('\n');
    indexSource(db, 'workshop', w.id, `Workshop: ${w.title}`, `${w.description ?? ''}\n${sessions}`);
  }
  // Announcements (published)
  for (const a of db.prepare('SELECT * FROM announcements WHERE is_published = 1 AND deleted_at IS NULL').all() as unknown as { id: number; title: string; body: string }[]) {
    indexSource(db, 'announcement', a.id, `Announcement: ${a.title}`, a.body);
  }
  // Scenarios
  for (const s of db.prepare('SELECT * FROM scenarios WHERE is_published = 1').all() as unknown as { id: number; title: string; description: string; situation_meaning: string; expected_phrases: string }[]) {
    const phrases = (safeJson(s.expected_phrases) as unknown as { tamil: string; meaning: string }[]).map((p) => `${p.tamil} — ${p.meaning}`).join('; ');
    indexSource(db, 'scenario', s.id, `Practice scenario: ${s.title}`, `${s.description ?? ''}\n${s.situation_meaning ?? ''}\nUseful phrases: ${phrases}`);
  }
  // Vocabulary grouped per course
  for (const c of db.prepare('SELECT id, title FROM courses').all() as unknown as { id: number; title: string }[]) {
    const words = db.prepare('SELECT tamil, transliteration, meaning, example_tamil, example_meaning FROM vocabulary WHERE course_id = ? AND is_published = 1').all(c.id) as unknown as { tamil: string; transliteration: string; meaning: string; example_tamil: string | null; example_meaning: string | null }[];
    if (words.length) {
      indexSource(db, 'vocabulary', c.id, `Vocabulary of course: ${c.title}`, words.map((w) => `${w.tamil} (${w.transliteration}) = ${w.meaning}${w.example_tamil ? `. Example: ${w.example_tamil} (${w.example_meaning ?? ''})` : ''}`).join('\n'));
    }
  }

  // Learning resources (NPTEL / YouTube / Alison / notes / books / guides)
  for (const r of db.prepare('SELECT * FROM learning_resources WHERE is_published = 1').all() as unknown as { id: number; title: string; type: string; provider: string; url: string; description: string; language: string; level: string }[]) {
    indexSource(db, 'resource', r.id, `Learning resource: ${r.title}`, `${r.type} · ${r.provider} · ${r.language}${r.level ? ` · ${r.level}` : ''}\n${r.description ?? ''}\nURL: ${r.url}`);
  }
  // Culture & heritage items
  for (const ci of db.prepare('SELECT * FROM culture_items WHERE is_published = 1').all() as unknown as { id: number; title: string; title_tamil: string; category: string; description: string; facts_json: string; region: string }[]) {
    const facts = (safeJson(ci.facts_json) as unknown as { l: string; v: string }[]).map((f) => `${f.l}: ${f.v}`).join('; ');
    indexSource(db, 'culture', ci.id, `Culture: ${ci.title} (${ci.title_tamil})`, `${ci.category} · ${ci.region ?? ''}\n${ci.description ?? ''}\n${facts}`);
  }
  // Tamil Nadu districts
  for (const d of db.prepare('SELECT * FROM tn_districts').all() as unknown as { id: number; name: string; name_tamil: string; famous_for: string; culture: string; food: string; temple: string; festival: string }[]) {
    indexSource(db, 'district', d.id, `District: ${d.name} (${d.name_tamil})`, `Famous for: ${d.famous_for ?? ''}\nCulture: ${d.culture ?? ''}\nFood: ${d.food ?? ''}\nTemple: ${d.temple ?? ''}\nFestival: ${d.festival ?? ''}`);
  }

  const docs = db.prepare("SELECT COUNT(*) AS c FROM ai_knowledge_documents WHERE status='current'").get() as unknown as { c: number };
  const chunks = db.prepare('SELECT COUNT(*) AS c FROM ai_knowledge_chunks').get() as unknown as { c: number };
  invalidateCache();
  return { documents: docs.c, chunks: chunks.c };
}

export function knowledgeStatus(db: DB = getDb()): {
  documents: number;
  chunks: number;
  stale: number;
  lastIndexed: string | null;
} {
  const docs = db.prepare("SELECT COUNT(*) AS c FROM ai_knowledge_documents WHERE status='current'").get() as unknown as { c: number };
  const stale = db.prepare("SELECT COUNT(*) AS c FROM ai_knowledge_documents WHERE status='stale'").get() as unknown as { c: number };
  const chunks = db.prepare('SELECT COUNT(*) AS c FROM ai_knowledge_chunks').get() as unknown as { c: number };
  const last = db.prepare('SELECT MAX(indexed_at) AS t FROM ai_knowledge_documents').get() as unknown as { t: string | null };
  return { documents: docs.c, chunks: chunks.c, stale: stale.c, lastIndexed: last.t };
}

function safeJson(s: string | null): unknown {
  if (!s) return [];
  try {
    return JSON.parse(s);
  } catch {
    return [];
  }
}

/** Exported for API routes: parse stored JSON text safely. */
export function safeJsonText(s: string | null): unknown {
  return safeJson(s);
}
