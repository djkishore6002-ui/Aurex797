import type { DB } from '@/db';
import { indexSource, blocksToText, safeJsonText } from './knowledge';

/** Reindex a single knowledge source (course / lesson / faq / page / workshop / scenario). */
export function reindexSingle(db: DB, sourceType: string, sourceId: number): { indexed: boolean; title: string } {
  switch (sourceType) {
    case 'course': {
      const c = db.prepare('SELECT * FROM courses WHERE id = ?').get(sourceId) as unknown as { title: string; subtitle: string | null; description: string | null; level_tag: string | null; is_published: number } | undefined;
      if (!c) return { indexed: false, title: '' };
      indexSource(db, 'course', sourceId, `Course: ${c.title}`, [c.subtitle, c.level_tag, c.description].filter(Boolean).join('\n'));
      return { indexed: true, title: c.title };
    }
    case 'lesson': {
      const l = db
        .prepare('SELECT l.*, m.title AS module_title, c.title AS course_title FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.id = ?')
        .get(sourceId) as unknown as { title: string; summary: string | null; content_json: string; transcript_text: string | null; course_title: string; module_title: string; is_published: number } | undefined;
      if (!l) return { indexed: false, title: '' };
      const text = [l.summary ?? '', blocksToText(safeJsonText(l.content_json)), l.transcript_text ?? ''].filter(Boolean).join('\n');
      indexSource(db, 'lesson', sourceId, `Lesson: ${l.title} (${l.course_title} → ${l.module_title})`, text);
      return { indexed: true, title: l.title };
    }
    case 'faq': {
      const f = db.prepare('SELECT * FROM faq_entries WHERE id = ?').get(sourceId) as unknown as { question: string; answer: string; category: string } | undefined;
      if (!f) return { indexed: false, title: '' };
      indexSource(db, 'faq', sourceId, `FAQ: ${f.question}`, `${f.category}\n${f.answer}`);
      return { indexed: true, title: f.question };
    }
    case 'page': {
      const p = db.prepare('SELECT * FROM static_pages WHERE id = ?').get(sourceId) as unknown as { title: string; body_json: string } | undefined;
      if (!p) return { indexed: false, title: '' };
      indexSource(db, 'page', sourceId, `Page: ${p.title}`, blocksToText(safeJsonText(p.body_json)));
      return { indexed: true, title: p.title };
    }
    case 'workshop': {
      const w = db.prepare('SELECT * FROM workshops WHERE id = ?').get(sourceId) as unknown as { title: string; description: string | null } | undefined;
      if (!w) return { indexed: false, title: '' };
      const sessions = db.prepare('SELECT title, starts_at, duration_minutes FROM workshop_sessions WHERE workshop_id = ?').all(sourceId) as unknown as { title: string; starts_at: string; duration_minutes: number }[];
      indexSource(db, 'workshop', sourceId, `Workshop: ${w.title}`, [w.description ?? '', sessions.map((s) => `Session: ${s.title} on ${s.starts_at} UTC for ${s.duration_minutes} minutes`).join('\n')].filter(Boolean).join('\n'));
      return { indexed: true, title: w.title };
    }
    case 'scenario': {
      const s = db.prepare('SELECT * FROM scenarios WHERE id = ?').get(sourceId) as unknown as { title: string; description: string | null; situation_meaning: string | null; expected_phrases: string } | undefined;
      if (!s) return { indexed: false, title: '' };
      const phrases = (safeJsonText(s.expected_phrases) as unknown as { tamil: string; meaning: string }[] | []).map((p) => `${p.tamil} — ${p.meaning}`).join('; ');
      indexSource(db, 'scenario', sourceId, `Practice scenario: ${s.title}`, `${s.description ?? ''}\n${s.situation_meaning ?? ''}\nUseful phrases: ${phrases}`);
      return { indexed: true, title: s.title };
    }
    default:
      return { indexed: false, title: '' };
  }
}
