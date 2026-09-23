import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { Badge, EmptyState, PageHead } from '@/components/ui';
import { DIFFICULTY_LABEL } from '@/lib/utils';

export const metadata: Metadata = { title: 'Courses' };

export default function LearnPage() {
  const db = getDb();
  const courses = db
    .prepare(
      `SELECT c.*, u.name AS instructor_name,
        (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND l.is_published = 1) AS lesson_count,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS learners
       FROM courses c LEFT JOIN users u ON u.id = c.instructor_id
       WHERE c.is_published = 1 AND c.deleted_at IS NULL ORDER BY c.sort_order`
    )
    .all() as unknown as {
    slug: string;
    title: string;
    subtitle: string | null;
    difficulty: string;
    level_tag: string | null;
    price_cents: number;
    instructor_name: string | null;
    lesson_count: number;
    learners: number;
  }[];

  return (
    <div className="container-page py-10">
      <PageHead title="Courses" subtitle="Structured Tamil learning from the first letter to professional conversation. Every course is free in this development build." />
      {courses.length === 0 ? (
        <EmptyState icon="📚" title="No published courses yet" body="The Super Admin publishes courses from the admin dashboard." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.slug} href={`/learn/${c.slug}`} className="card group flex flex-col overflow-hidden transition-shadow hover:shadow-md">
              <div className="flex h-32 items-center justify-center bg-gradient-to-br from-brand-700 to-brand-900">
                <span aria-hidden className="tamil text-5xl font-bold text-white/90">
                  {c.title.charAt(0)}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-bold text-ink-950 group-hover:text-brand-800">{c.title}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">{c.subtitle}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="success">{c.level_tag ?? DIFFICULTY_LABEL[c.difficulty]}</Badge>
                  <Badge>{c.lesson_count} lessons</Badge>
                  <Badge tone={c.price_cents > 0 ? 'warning' : 'default'}>{c.price_cents > 0 ? `₹${c.price_cents / 100}` : 'Free'}</Badge>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-ink-400">
                  <span>👩‍🏫 {c.instructor_name ?? 'Solai Academy'}</span>
                  <span>🌱 {c.learners} learners</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
