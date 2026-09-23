import Link from 'next/link';
import { getDb } from '@/db';
import { Badge, ProgressBar } from '@/components/ui';
import { checkCourseEligibility } from '@/lib/certificates';

export function LessonSidebar({ courseId, courseSlug, currentLessonSlug, enrolled, userId }: { courseId: number; courseSlug: string; currentLessonSlug: string; enrolled: boolean; userId: number | null }) {
  const db = getDb();
  const course = db.prepare('SELECT title, level_tag, is_published FROM courses WHERE id = ?').get(courseId) as unknown as { title: string; level_tag: string | null } | null;
  if (!course) return null;

  const modules = db
    .prepare(
      `SELECT m.id, m.title,
        (SELECT COUNT(*) FROM lessons l WHERE l.module_id = m.id AND l.is_published = 1) AS total
       FROM course_modules m WHERE m.course_id = ? AND m.is_published = 1 ORDER BY m.sort_order`
    )
    .all(courseId) as unknown as { id: number; title: string; total: number }[];

  const lessons = db
    .prepare(
      `SELECT l.id, l.slug, l.title, l.module_id, p.completion_percentage, p.completed_at
       FROM lessons l
       JOIN course_modules m ON m.id = l.module_id
       LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
       WHERE m.course_id = ? AND l.is_published = 1 ORDER BY m.sort_order, l.sort_order`
    )
    .all(userId ?? 0, courseId) as unknown as { id: number; slug: string; title: string; module_id: number; completion_percentage: number | null; completed_at: string | null }[];

  const e = userId ? checkCourseEligibility(db, userId, courseId) : null;

  return (
    <aside className="space-y-5" aria-label="Course contents">
      {e && (
        <div className="card p-5">
          <p className="text-sm font-bold text-ink-900">Course progress</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar value={e.percentage} label="Course progress" />
            </div>
            <span className="text-sm font-bold text-brand-700">{e.percentage}%</span>
          </div>
          <p className="mt-2 text-xs text-ink-500">
            {e.completedLessons}/{e.totalLessons} lessons complete
          </p>
          {e.eligible && (
            <div className="mt-3 rounded-xl bg-marigold-50 px-3 py-2 text-xs font-semibold text-marigold-900">
              🎉 Eligible for the course certificate!
            </div>
          )}
        </div>
      )}

      <div className="card overflow-hidden">
        <p className="border-b border-ink-100 px-4 py-3 text-sm font-bold text-ink-900">In this course</p>
        <nav className="max-h-[50vh] overflow-y-auto p-2">
          {modules.map((m) => {
            const modLessons = lessons.filter((l) => l.module_id === m.id);
            return (
              <div key={m.id} className="mb-2">
                <p className="px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">{m.title}</p>
                <ul>
                  {modLessons.map((l) => {
                    const active = l.slug === currentLessonSlug;
                    const done = l.completed_at != null || l.completion_percentage === 100;
                    return (
                      <li key={l.id}>
                        <Link
                          href={`/learn/${courseSlug}/${l.slug}`}
                          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm ${active ? 'bg-brand-700 font-semibold text-white' : 'text-ink-700 hover:bg-ink-50'}`}
                        >
                          <span aria-hidden className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${done ? 'bg-brand-600 text-white' : active ? 'bg-white/25 text-white' : 'bg-ink-100 text-ink-400'}`}>
                            {done ? '✓' : ''}
                          </span>
                          <span className="min-w-0 flex-1 truncate">{l.title}</span>
                          {!done && l.completion_percentage ? <span className={`text-[10px] ${active ? 'text-brand-100' : 'text-ink-400'}`}>{Math.round(l.completion_percentage!)}%</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      {!enrolled && (
        <div className="card border-marigold-200 bg-marigold-50 p-4 text-sm text-marigold-900">
          <p className="font-semibold">Free to enroll</p>
          <p className="mt-1">
            <Link href={`/learn/${courseSlug}`} className="font-semibold underline">
              Enroll
            </Link>{' '}
            to save progress, earn XP and unlock the certificate.
          </p>
        </div>
      )}
    </aside>
  );
}
