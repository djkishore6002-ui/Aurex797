import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { Badge, PageHead } from '@/components/ui';
import { TutorContextBridge } from '@/components/TutorContextBridge';
import { ScenarioPlayer } from './scenario-player';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const db = getDb();
  const s = db.prepare('SELECT title FROM scenarios WHERE slug = ? AND is_published = 1').get(params.slug) as unknown as { title: string } | undefined;
  return { title: s ? `${s.title} · Practice` : 'Scenario not found' };
}

export default function ScenarioPage({ params }: { params: { slug: string } }) {
  const db = getDb();
  const scenario = db.prepare('SELECT * FROM scenarios WHERE slug = ? AND is_published = 1').get(params.slug) as unknown as {
    id: number;
    title: string;
    description: string | null;
    level: string;
    icon: string;
    situation_tamil: string;
    situation_translit: string | null;
    situation_meaning: string | null;
    starter_prompt: string;
    expected_phrases: string;
    success_hint: string | null;
  } | undefined;
  if (!scenario) notFound();

  let phrases: { tamil: string; translit: string; meaning: string }[] = [];
  try {
    phrases = JSON.parse(scenario.expected_phrases);
  } catch {
    phrases = [];
  }

  return (
    <div className="container-page max-w-3xl py-10">
      <TutorContextBridge context={{ type: 'scenario', id: scenario.id, label: scenario.title, text: `${scenario.description ?? ''}\n${scenario.situation_meaning ?? ''}\nPhrases: ${phrases.map((p) => `${p.tamil} — ${p.meaning}`).join('; ')}` }} />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-400">
        <Link href="/practice" className="hover:text-brand-700">Practice</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-ink-700">{scenario.title}</span>
      </nav>

      <PageHead
        title={`${scenario.icon} ${scenario.title}`}
        subtitle={scenario.description}
        actions={<Badge tone="success">{scenario.level}</Badge>}
      />

      {scenario.success_hint && (
        <div className="mb-6 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900">
          <b>Goal:</b> {scenario.success_hint}
        </div>
      )}

      <ScenarioPlayer
        scenarioId={scenario.id}
        title={scenario.title}
        situationTamil={scenario.situation_tamil}
        situationTranslit={scenario.situation_translit ?? ''}
        situationMeaning={scenario.situation_meaning ?? ''}
        starterPrompt={scenario.starter_prompt}
        phrases={phrases}
      />

      <section className="mt-8" aria-label="Useful phrases">
        <h2 className="mb-3 text-lg font-bold">Useful phrases for this scene</h2>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {phrases.map((p, i) => (
            <li key={i} className="card p-4">
              <p className="tamil text-lg font-bold text-brand-900">{p.tamil}</p>
              <p className="text-sm italic text-ink-500">/ {p.translit} /</p>
              <p className="mt-1 text-sm text-ink-700">{p.meaning}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
