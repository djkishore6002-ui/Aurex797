import type { Metadata } from 'next';
import { getDb } from '@/db';
import { getFaq } from '@/lib/cms';
import { PageHead } from '@/components/ui';

export const metadata: Metadata = { title: 'FAQ' };

export default function FaqPage() {
  const db = getDb();
  const faqs = getFaq(db);
  const groups = new Map<string, typeof faqs>();
  for (const f of faqs) {
    groups.set(f.category, [...(groups.get(f.category) ?? []), f]);
  }
  return (
    <div className="container-page max-w-3xl py-10">
      <PageHead title="Frequently asked questions" subtitle="Everything about courses, certificates, workshops and the AI tutor. Can’t find it? Ask a teacher." />
      <div className="space-y-8">
        {[...groups.entries()].map(([category, items]) => (
          <section key={category} aria-label={category}>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">{category}</h2>
            <div className="space-y-3">
              {items.map((f) => (
                <details key={f.id} className="card group p-5">
                  <summary className="cursor-pointer list-none text-[15px] font-semibold text-ink-900 marker:content-none">
                    <span className="mr-2 text-brand-600" aria-hidden>
                      Q
                    </span>
                    {f.question}
                  </summary>
                  <p className="tamil mt-3 whitespace-pre-wrap pl-6 text-sm leading-relaxed text-ink-600">{f.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
