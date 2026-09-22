import type { Metadata } from 'next';
import { getDb, plainRows } from '@/db';
import { Badge, PageHead } from '@/components/ui';
import { VocabExplorer } from './vocab-explorer';

export const metadata: Metadata = { title: 'Vocabulary' };

export default function VocabularyPage() {
  const db = getDb();
  const courses = plainRows<{ id: number; title: string }>(
    db.prepare('SELECT id, title FROM courses WHERE is_published = 1 ORDER BY sort_order').all()
  );
  const all = plainRows<{ id: number; tamil: string; transliteration: string; meaning: string; part_of_speech: string | null; example_tamil: string | null; course_title: string | null }>(
    db
      .prepare(
        `SELECT v.id, v.tamil, v.transliteration, v.meaning, v.part_of_speech, v.example_tamil, c.title AS course_title
         FROM vocabulary v LEFT JOIN courses c ON c.id = v.course_id
         WHERE v.is_published = 1 ORDER BY v.id`
      )
      .all()
  );

  return (
    <div className="container-page py-10">
      <PageHead
        title="Vocabulary"
        subtitle="Every word you learn in lessons — searchable, and indexed for the AI tutor. Ask it about any word you see here."
        actions={<Badge tone="success">{all.length} words</Badge>}
      />
      <VocabExplorer words={all} courses={courses} />
    </div>
  );
}
