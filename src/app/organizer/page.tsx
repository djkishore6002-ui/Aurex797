import Link from 'next/link';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { PageHead, StatCard, Badge } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { workshopAttendanceSummary } from '@/lib/attendance';

export const dynamic = 'force-dynamic';

export default function OrganizerDashboard() {
  const user = getCurrentUser()!;
  const db = getDb();
  const mine = db
    .prepare(
      `SELECT id, slug, title, starts_at, duration_minutes, capacity, certificate_enabled FROM workshops
       WHERE deleted_at IS NULL AND is_published = 1 AND (instructor_id = ? OR organizer_id = ?) ORDER BY starts_at`
    )
    .all(user.id, user.id) as unknown as { id: number; slug: string; title: string; starts_at: string; duration_minutes: number; capacity: number; certificate_enabled: number }[];

  const openQuestions = db
    .prepare("SELECT COUNT(*) c FROM learner_questions WHERE status != 'resolved' AND (assigned_teacher_id = ? OR (assigned_teacher_id IS NULL))")
    .get(user.id) as unknown as { c: number };
  const myQuestions = db
    .prepare(
      `SELECT lq.id, lq.title, lq.status, u.name AS learner, lq.created_at,
        (SELECT body FROM teacher_answers ta WHERE ta.question_id = lq.id ORDER BY ta.created_at DESC LIMIT 1) AS latest_answer
       FROM learner_questions lq JOIN users u ON u.id = lq.user_id
       WHERE lq.assigned_teacher_id = ? ORDER BY lq.created_at DESC LIMIT 8`
    )
    .all(user.id) as unknown as Record<string, unknown>[];

  const courseStats = db
    .prepare(
      `SELECT c.id, c.title,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') AS learners,
        (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND p.completed_at IS NOT NULL) AS completions
       FROM courses c WHERE c.instructor_id = ? OR c.organizer_id = ? ORDER BY learners DESC`
    )
    .all(user.id, user.id) as unknown as { id: number; title: string; learners: number; completions: number }[];

  const workshopRows = mine
    .filter((w) => new Date(w.starts_at).getTime() < Date.now() + 30 * 86400_000)
    .map((w) => {
      const regs = (db.prepare("SELECT COUNT(*) c FROM workshop_registrations WHERE workshop_id = ? AND status IN ('CONFIRMED','PAID')").get(w.id) as unknown as { c: number }).c;
      const s = workshopAttendanceSummary(db, w.id, 0); // total required
      return { ...w, regs, totalRequired: s.totalRequiredMinutes };
    });

  return (
    <div>
      <PageHead title={`Overview`} subtitle={`${courseStats.length} assigned course${courseStats.length === 1 ? '' : 's'} · ${mine.length} workshop${mine.length === 1 ? '' : 's'} · ${openQuestions.c} open question${openQuestions.c === 1 ? '' : 's'}`} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open questions" value={openQuestions.c} icon="🙋" />
        <StatCard label="My courses" value={courseStats.length} icon="📚" />
        <StatCard label="My workshops" value={mine.length} icon="🎤" />
        <StatCard label="Total learners" value={courseStats.reduce((a, c) => a + c.learners, 0)} icon="🌱" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">My courses</h2>
            <Link href="/admin/courses" className="text-xs font-semibold text-brand-700 hover:underline">Manage →</Link>
          </div>
          {courseStats.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No courses assigned to you yet.</p>
          ) : (
            <table className="mt-3 w-full text-sm">
              <thead><tr className="border-b border-ink-100 text-left text-xs text-ink-400"><th className="py-2">Course</th><th className="py-2">Learners</th><th className="py-2">Lesson completions</th></tr></thead>
              <tbody>
                {courseStats.map((c) => (
                  <tr key={c.id} className="border-b border-ink-50 last:border-b-0">
                    <td className="py-2.5 font-medium">{c.title}</td>
                    <td className="py-2.5">{c.learners}</td>
                    <td className="py-2.5">{c.completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Workshops (attendance)</h2>
            <Link href="/organizer/workshops" className="text-xs font-semibold text-brand-700 hover:underline">Manage →</Link>
          </div>
          {workshopRows.length === 0 ? (
            <p className="mt-4 text-sm text-ink-500">No active workshops.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {workshopRows.map((w) => (
                <div key={w.id} className="rounded-xl border border-ink-100 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/workshops/${w.slug}`} className="font-semibold hover:text-brand-800">{w.title}</Link>
                    <Badge tone={w.certificate_enabled ? 'success' : 'default'}>{w.certificate_enabled ? '90% certificate' : 'no certificate'}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{fmtDate(w.starts_at)} · {w.regs}/{w.capacity} registered · required minutes: {w.totalRequired}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Questions assigned to you</h2>
          <Link href="/organizer/questions" className="text-xs font-semibold text-brand-700 hover:underline">Open board →</Link>
        </div>
        {myQuestions.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">Nothing pending — learners are getting along. 🌿</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {myQuestions.map((q) => (
              <li key={q.id as number} className="flex flex-wrap items-center gap-2 rounded-xl bg-ink-50 px-4 py-3">
                <Badge tone={q.status === 'open' ? 'warning' : 'info'}>{String(q.status)}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{String(q.title)}</span>
                <span className="text-xs text-ink-400">{String(q.learner)} · {fmtDate(q.created_at as string)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
