import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { Badge, EmptyState } from '@/components/ui';
import { DIFFICULTY_LABEL, formatPrice } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { EnrollButton } from './enroll-button';
import { CourseProgress } from './course-progress';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

/**
 * Static snapshot (GitHub Pages): prerender every published course.
 * In the live (server) app this returns [] so the page stays
 * `force-dynamic` and always reflects current enrollment state.
 */
export const generateStaticParams: () => { courseSlug: string }[] =
  process.env.SOLAI_STATIC === '1'
    ? () => {
        const db = getDb();
        const rows = db
          .prepare('SELECT slug FROM courses WHERE is_published = 1 AND deleted_at IS NULL')
          .all() as unknown as { slug: string }[];
        return rows.map((r) => ({ courseSlug: r.slug }));
      }
    : () => [];

export async function generateMetadata({ params }: { params: { courseSlug: string } }): Promise<Metadata> {
  const db = getDb();
  const c = db.prepare('SELECT title FROM courses WHERE slug = ? AND is_published = 1 AND deleted_at IS NULL').get(params.courseSlug) as unknown as { title: string } | undefined;
  return { title: c?.title ?? 'Course not found' };
}

export default function CoursePage({ params }: { params: { courseSlug: string } }) {
  const db = getDb();
  const course = db
    .prepare(
      `SELECT c.*, u.name AS instructor_name
       FROM courses c LEFT JOIN users u ON u.id = c.instructor_id
       WHERE c.slug = ? AND c.deleted_at IS NULL`
    )
    .get(params.courseSlug) as
    | { id: number; slug: string; title: string; subtitle: string | null; description: string | null; difficulty: string; level_tag: string | null; instructor_name: string | null; price_cents: number; certificate_enabled: number; duration_hours: number; is_published: number }
    | undefined;
  if (!course || !course.is_published) notFound();

  const user = getCurrentUser();
  const enrolled = user ? db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = ?').get(user.id, course.id, 'active') : null;

  const modules = db
    .prepare(
      `SELECT m.*,
        (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) AS lesson_count
       FROM course_modules m WHERE m.course_id = ? AND m.is_published = 1 ORDER BY m.sort_order`
    )
    .all(course.id) as unknown as { id: number; title: string; description: string | null; lesson_count: number }[];

  const lessons = db
    .prepare(
      `SELECT l.*, m.id AS module_id, m.title AS module_title, m.sort_order AS module_order
       FROM lessons l JOIN course_modules m ON m.id = l.module_id
       WHERE m.course_id = ? AND l.is_published = 1 ORDER BY m.sort_order, l.sort_order`
    )
    .all(course.id) as unknown as {
    id: number;
    slug: string;
    title: string;
    summary: string | null;
    video_url: string | null;
    video_duration_seconds: number;
    module_id: number;
    module_title: string;
    module_order: number;
    sort_order: number;
    xp: number;
  }[];

  const byModule = new Map<number, typeof lessons>();
  for (const l of lessons) {
    byModule.set(l.module_id, [...(byModule.get(l.module_id) ?? []), l]);
  }

  return (
    <div className="container-page py-10">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-brand-800 to-brand-950 p-8 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Badge tone="success">{course.level_tag ?? DIFFICULTY_LABEL[course.difficulty]}</Badge>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">{course.title}</h1>
            {course.subtitle && <p className="mt-2 text-brand-200">{course.subtitle}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="text-2xl font-bold">{formatPrice(course.price_cents)}</span>
            <EnrollButton courseId={Number(course.id)} enrolled={!!enrolled} />
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-brand-100">
          <span>👩‍🏫 {course.instructor_name ?? 'Solai Academy'}</span>
          <span>📚 {lessons.length} lessons</span>
          <span>⏱️ {Math.round(course.duration_hours)} hours</span>
          {course.certificate_enabled ? <span>🎓 Certificate at 90% completion</span> : null}
        </div>
        {enrolled && user && <div className="mt-5"><CourseProgress courseId={Number(course.id)} userId={user.id} /></div>}
      </div>

      {course.description && <p className="mb-8 max-w-3xl text-[15px] leading-relaxed text-ink-600">{course.description}</p>}

      {lessons.length === 0 ? (
        <EmptyState icon="📚" title="Lessons coming soon" body="This course has no published lessons yet." />
      ) : (
        <div className="space-y-8">
          {modules.map((m) => (
            <section key={m.id} aria-label={m.title}>
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-ink-950">{m.title}</h2>
                <span className="text-xs text-ink-400">{m.lesson_count} lessons</span>
              </div>
              {m.description && <p className="mb-3 text-sm text-ink-500">{m.description}</p>}
              <div className="space-y-2">
                {(byModule.get(m.id) ?? []).map((l, idx) => (
                  <LessonRow key={l.id} lesson={l} courseSlug={course.slug} enrolled={!!enrolled} index={idx + 1} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function LessonRow({
  lesson,
  courseSlug,
  enrolled,
  index,
}: {
  lesson: { id: number; slug: string; title: string; video_url: string | null; video_duration_seconds: number; summary: string | null; xp: number };
  courseSlug: string;
  enrolled: boolean;
  index: number;
}) {
  const user = getCurrentUser();
  let progress: { completion_percentage: number; completed_at: string | null } | null = null;
  if (user) {
    progress = getDb()
      .prepare('SELECT completion_percentage, completed_at FROM lesson_progress WHERE user_id = ? AND lesson_id = ?')
      .get(user.id, lesson.id) as unknown as { completion_percentage: number; completed_at: string | null } | null;
  }
  const done = progress?.completed_at != null || progress?.completion_percentage === 100;
  return (
    <Link
      href={`/learn/${courseSlug}/${lesson.slug}`}
      className={`card flex items-center gap-4 px-4 py-3.5 transition-shadow hover:shadow-md ${done ? 'border-brand-300 bg-brand-50/40' : ''}`}
    >
      <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500'}`}>
        {done ? '✓' : index}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">{lesson.title}</p>
        <p className="truncate text-xs text-ink-400">{lesson.video_url ? '🎬 Video lesson' : '📖 Reading lesson'} · +{lesson.xp} XP</p>
      </div>
      {progress && progress.completion_percentage > 0 && !done && (
        <span className="shrink-0 text-xs font-semibold text-brand-700">{Math.round(progress.completion_percentage)}%</span>
      )}
      {!enrolled && <Badge tone="info">Enroll to start</Badge>}
    </Link>
  );
}
