import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { VocabularyAdmin } from './vocabulary-admin';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminVocabularyPage() {
  const db = getDb();
  const words = plainRows<{
    id: number;
    tamil: string;
    transliteration: string;
    meaning: string;
    part_of_speech: string | null;
    example_tamil: string | null;
    example_meaning: string | null;
    course_id: number | null;
    is_published: number;
    course_title: string | null;
  }>(
    db
      .prepare(
        `SELECT v.id, v.tamil, v.transliteration, v.meaning, v.part_of_speech, v.example_tamil, v.example_meaning, v.course_id, v.is_published, c.title AS course_title
         FROM vocabulary v LEFT JOIN courses c ON c.id = v.course_id ORDER BY v.id`
      )
      .all()
  );
  const courses = plainRows<{ id: number; title: string }>(
    db.prepare('SELECT id, title FROM courses WHERE deleted_at IS NULL ORDER BY sort_order').all()
  );

  return (
    <div>
      <PageHead title="Vocabulary" subtitle="Add, edit and remove words. Changes propagate to the learner explorer and the AI knowledge base instantly." />
      <VocabularyAdmin
        words={words}
        courses={courses}
      />
    </div>
  );
}
