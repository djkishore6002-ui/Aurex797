import type { Metadata } from 'next';
import Link from 'next/link';
import { getDb } from '@/db';
import { getCurrentUser } from '@/lib/auth';
import { checkCourseEligibility, checkWorkshopEligibility } from '@/lib/certificates';
import { computeStreak, totalXp, todayXp, vocabLearnedCount } from '@/lib/gamify';
import { fmtDate, fmtDateTime, pct, timeAgo } from '@/lib/utils';
import { Badge, EmptyState, PageHead, ProgressBar, StatCard } from '@/components/ui';
import { ClaimCertificateButton } from '@/components/ClaimCertificateButton';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { title: 'Dashboard' };

export default function DashboardPage() {
  const user = getCurrentUser();
  if (!user) redirect('/login');
  const db = getDb();

  const xp = totalXp(db, user.id);
  const streak = computeStreak(db, user.id);
  const xpToday = todayXp(db, user.id);
  const vocabCount = vocabLearnedCount(db, user.id);

  // Continue learning: first active enrollment with its next incomplete lesson
  const enrollments = db
    .prepare(
      `SELECT e.course_id, c.slug AS course_slug, c.title AS course_title
       FROM enrollments e JOIN courses c ON c.id = e.course_id
       WHERE e.user_id = ? AND e.status = 'active' ORDER BY e.enrolled_at DESC`
    )
    .all(user.id) as unknown as { course_id: number; course_slug: string; course_title: string }[];

  const continueInfo = (() => {
    for (const e of enrollments) {
      const total = (db.prepare(`SELECT COUNT(*) AS c FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND l.is_published = 1`).get(e.course_id) as unknown as { c: number }).c;
      if (total === 0) continue;
      const done = (db.prepare(`SELECT COUNT(*) AS c FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = ? AND p.user_id = ? AND p.completed_at IS NOT NULL`).get(e.course_id, user.id) as unknown as { c: number }).c;
      const next = db
        .prepare(
          `SELECT l.id, l.slug, l.title, l.video_url FROM lessons l
           JOIN course_modules m ON m.id = l.module_id
           LEFT JOIN lesson_progress p ON p.lesson_id = l.id AND p.user_id = ?
           WHERE m.course_id = ? AND l.is_published = 1 AND (p.completed_at IS NULL)
           ORDER BY m.sort_order, l.sort_order LIMIT 1`
        )
        .get(user.id, e.course_id) as unknown as { id: number; slug: string; title: string; video_url: string | null } | null;
      if (next || done < total) {
        const progress = next
          ? ((db.prepare('SELECT completion_percentage FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, next.id) as unknown as { completion_percentage: number } | null)?.completion_percentage ?? 0)
          : 100;
        return { ...e, next, done, total, percent: pct(done, total), progress };
      }
    }
    return null;
  })();

  const upcomingWorkshops = db
    .prepare(
      `SELECT w.id, w.slug, w.title, w.starts_at, w.price_cents, r.status AS reg_status
       FROM workshops w
       LEFT JOIN workshop_registrations r ON r.workshop_id = w.id AND r.user_id = ?
       WHERE w.is_published = 1 AND w.deleted_at IS NULL AND w.starts_at > datetime('now')
       ORDER BY w.starts_at LIMIT 4`
    )
    .all(user.id) as unknown as { id: number; slug: string; title: string; starts_at: string; price_cents: number; reg_status: string | null }[];

  const announcements = db
    .prepare(
      `SELECT id, title, body, scope, publish_at, created_at FROM announcements
       WHERE is_published = 1 AND deleted_at IS NULL AND (scope = 'global' OR (scope = 'course' AND target_id IN (SELECT course_id FROM enrollments WHERE user_id = ?)) OR (scope = 'workshop' AND target_id IN (SELECT workshop_id FROM workshop_registrations WHERE user_id = ?)))
       ORDER BY created_at DESC LIMIT 5`
    )
    .all(user.id, user.id) as unknown as { id: number; title: string; body: string; scope: string; created_at: string }[];

  const teacherAnswers = db
    .prepare(
      `SELECT ta.created_at, lq.title, ta.body FROM teacher_answers ta
       JOIN learner_questions lq ON lq.id = ta.question_id
       WHERE lq.user_id = ? ORDER BY ta.created_at DESC LIMIT 3`
    )
    .all(user.id) as unknown as { created_at: string; title: string; body: string }[];

  const certificates = db
    .prepare('SELECT certificate_id, title_text, issued_at, revoked_at FROM certificates WHERE user_id = ? ORDER BY issued_at DESC LIMIT 4').all(user.id) as unknown as { certificate_id: string; title_text: string; issued_at: string; revoked_at: string | null }[];

  const claimable = (() => {
    const list: { kind: 'course' | 'workshop'; id: number; title: string; percent: number }[] = [];
    for (const e of enrollments) {
      const el = checkCourseEligibility(db, user.id, e.course_id);
      const has = db.prepare('SELECT certificate_id FROM certificates WHERE user_id = ? AND course_id = ? AND revoked_at IS NULL').get(user.id, e.course_id);
      if (el.eligible && !has) list.push({ kind: 'course', id: e.course_id, title: e.course_title, percent: el.percentage });
    }
    const regs = db
      .prepare(
        `SELECT r.workshop_id, w.title FROM workshop_registrations r JOIN workshops w ON w.id = r.workshop_id
         WHERE r.user_id = ? AND r.status IN ('CONFIRMED','PAID')`
      )
      .all(user.id) as unknown as { workshop_id: number; title: string }[];
    for (const r of regs) {
      const el = checkWorkshopEligibility(db, user.id, r.workshop_id);
      const has = db.prepare('SELECT certificate_id FROM certificates WHERE user_id = ? AND workshop_id = ? AND revoked_at IS NULL').get(user.id, r.workshop_id);
      if (el.eligible && !has) list.push({ kind: 'workshop', id: r.workshop_id, title: r.title, percent: el.percentage });
    }
    return list;
  })();

  return (
    <div className="container-page py-8">
      <PageHead
        title={`Vanakkam, ${user.name.split(' ')[0]} 👋`}
        subtitle={user.learning_goal ? `Goal: ${user.learning_goal}` : 'Here is your learning garden today.'}
      />

      {/* Claimable certificates */}
      {claimable.length > 0 && (
        <div className="mb-8 rounded-2xl border border-marigold-300 bg-gradient-to-r from-marigold-50 to-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-ink-950">🎓 You have earned a certificate!</h2>
              <p className="mt-1 text-sm text-ink-600">
                {claimable.map((c) => c.title).join(', ')} — {claimable[0].percent}% requirement met.
              </p>
            </div>
            {claimable.map((c) => (
              <ClaimCertificateButton key={`${c.kind}-${c.id}`} kind={c.kind} id={c.id} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Continue learning */}
          <section aria-label="Continue learning" className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Continue learning</h2>
            {continueInfo ? (
              <div className="mt-4">
                <p className="text-xl font-bold text-ink-950">
                  <Link href={`/learn/${continueInfo.course_slug}`} className="hover:text-brand-800">
                    {continueInfo.course_title}
                  </Link>
                </p>
                {continueInfo.next ? (
                  <>
                    <p className="mt-1 text-sm text-ink-500">
                      Next up: <span className="font-semibold text-ink-800">{continueInfo.next.title}</span>
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1">
                        <ProgressBar value={continueInfo.progress} label="Lesson progress" />
                      </div>
                      <span className="text-sm font-bold text-brand-700">{Math.round(continueInfo.progress)}%</span>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-ink-500">All lessons complete in this course 🎉</p>
                )}
                <div className="mt-4 flex items-center gap-3">
                  {continueInfo.next ? (
                    <Link href={`/learn/${continueInfo.course_slug}/${continueInfo.next.slug}`} className="btn-primary">
                      {continueInfo.next.video_url ? '▶ Continue watching' : 'Continue learning'}
                    </Link>
                  ) : (
                    <Link href={`/learn/${continueInfo.course_slug}`} className="btn-primary">
                      Review course
                    </Link>
                  )}
                  <span className="text-xs text-ink-400">
                    {continueInfo.done}/{continueInfo.total} lessons · course {continueInfo.percent}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-500">Pick your first course and start your Tamil journey.</p>
                <Link href="/learn" className="btn-primary">
                  Browse courses
                </Link>
              </div>
            )}
          </section>

          {/* Upcoming workshops */}
          <section aria-label="Upcoming workshops" className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Upcoming workshops</h2>
              <Link href="/workshops" className="text-xs font-semibold text-brand-700 hover:underline">
                See all →
              </Link>
            </div>
            {upcomingWorkshops.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">No upcoming workshops right now.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {upcomingWorkshops.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-ink-100 p-3.5">
                    <div className="min-w-0 flex-1">
                      <Link href={`/workshops/${w.slug}`} className="font-semibold text-ink-900 hover:text-brand-800">
                        {w.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-500">
                        📅 {fmtDateTime(w.starts_at)} · {w.price_cents > 0 ? `₹${w.price_cents / 100}` : 'Free'}
                      </p>
                    </div>
                    {w.reg_status ? (
                      <Badge tone={w.reg_status === 'PENDING' ? 'warning' : 'success'}>{w.reg_status === 'PENDING' ? 'Payment pending' : 'Registered ✓'}</Badge>
                    ) : (
                      <Link href={`/workshops/${w.slug}`} className="btn-secondary !py-1.5 text-xs">
                        Register
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent teacher answers */}
          <section aria-label="Recent teacher answers" className="card p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Recent teacher answers</h2>
              <Link href="/ask" className="text-xs font-semibold text-brand-700 hover:underline">
                Ask a question →
              </Link>
            </div>
            {teacherAnswers.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">No teacher answers yet — ask your first question!</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {teacherAnswers.map((a, i) => (
                  <li key={i} className="rounded-xl bg-ink-50 p-3.5">
                    <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                    <p className="tamil mt-1 line-clamp-2 text-sm text-ink-600">{a.body}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="XP" value={xp} icon="⚡" hint={`${xpToday} today`} />
            <StatCard label="Streak" value={`${streak}🔥`} icon="📅" hint={streak > 0 ? 'days in a row' : 'start today!'} />
            <StatCard label="Words learned" value={vocabCount} icon="📝" />
            <StatCard label="Certificates" value={certificates.length} icon="🎓" />
          </div>

          {/* Certificates */}
          <section aria-label="Certificates" className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Your certificates</h2>
            {certificates.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">
                Reach 90% in a course or workshop to earn your first certificate.{' '}
                <Link href="/faq" className="text-brand-700 underline">
                  How it works
                </Link>
              </p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {certificates.map((c) => (
                  <li key={c.certificate_id} className="flex items-center gap-3 rounded-xl border border-ink-100 p-3">
                    <span aria-hidden className="text-xl">🎓</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.title_text}</p>
                      <p className="text-[11px] text-ink-400">
                        {c.certificate_id} · {fmtDate(c.issued_at)}
                      </p>
                    </div>
                    <Link href={`/verify/${c.certificate_id}`} className="text-xs font-semibold text-brand-700 hover:underline">
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Announcements */}
          <section aria-label="Announcements" className="card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Announcements</h2>
            {announcements.length === 0 ? (
              <p className="mt-3 text-sm text-ink-500">Nothing new right now.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {announcements.map((a) => (
                  <li key={a.id} className="border-b border-ink-50 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-ink-500">{a.body}</p>
                    <p className="mt-1 text-[11px] text-ink-400">{timeAgo(a.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
