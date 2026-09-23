import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { Badge, PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'Practice scenarios' };

export default function PracticePage() {
  const db = getDb();
  const scenarios = db.prepare('SELECT * FROM scenarios WHERE is_published = 1 ORDER BY sort_order').all() as unknown as {
    id: number;
    slug: string;
    title: string;
    description: string | null;
    level: string;
    icon: string;
  }[];

  return (
    <div className="container-page py-10">
      <PageHead
        title="Real-life scenarios"
        subtitle="Step into the situations where you will actually use Tamil. The AI plays the other person and gives you feedback on vocabulary, sentence correctness and appropriateness."
        actions={
          <Link href="/practice/speak" className="btn-primary">
            🎙️ Speaking practice
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <Link key={s.id} href={`/practice/${s.slug}`} className="card group p-6 transition-shadow hover:shadow-md">
            <span aria-hidden className="text-4xl">{s.icon}</span>
            <h2 className="mt-3 font-bold text-ink-950 group-hover:text-brand-800">{s.title}</h2>
            <p className="mt-1 text-sm text-ink-500">{s.description}</p>
            <div className="mt-3">
              <Badge tone="success">{s.level}</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
