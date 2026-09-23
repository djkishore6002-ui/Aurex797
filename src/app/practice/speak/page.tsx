import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { SpeakClient } from './speak-client';

export const metadata: Metadata = { title: 'Speaking practice' };

export default function SpeakPage() {
  const db = getDb();
  const sentences = plainRows<{ id: number; tamil: string; transliteration: string; meaning: string; example_tamil: string | null; example_meaning: string | null }>(
    db
      .prepare(
        `SELECT v.id, v.tamil, v.transliteration, v.meaning, v.example_tamil, v.example_meaning
         FROM vocabulary v WHERE v.is_published = 1 AND (v.example_tamil IS NOT NULL OR v.tamil LIKE '% %')
         ORDER BY v.id LIMIT 40`
      )
      .all()
  );
  const extras = [
    { id: -1, tamil: 'எனக்கு ஒரு தேநீர் வேண்டும்', transliteration: 'enakku oru theenir venum', meaning: 'I want a tea, please', example_tamil: null, example_meaning: null },
    { id: -2, tamil: 'என் பெயர் என்ன?', transliteration: 'en peyar enna?', meaning: 'What is your name?', example_tamil: null, example_meaning: null },
    { id: -3, tamil: 'வணக்கம், நான் நன்றாக இருக்கிறேன்', transliteration: 'vanakkam, naan nandriaagu irukkiREN', meaning: 'Hello, I am doing well', example_tamil: null, example_meaning: null },
  ];

  return (
    <div className="container-page max-w-3xl py-10">
      <PageHead
        title="🎙️ Speaking practice"
        subtitle="Read the expected sentence, speak it, and the browser's speech recognition (where supported) will compare your words and highlight what to polish. This is educational feedback — not a professional pronunciation assessment."
        actions={<Link href="/practice" className="btn-secondary">← Scenarios</Link>}
      />
      <SpeakClient sentences={[...extras, ...sentences]} />
    </div>
  );
}
