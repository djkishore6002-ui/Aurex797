import Link from 'next/link';
import { getDb } from '@/db';
import { PageHead, StatCard, Badge } from '@/components/ui';
import { fmtDate, timeAgo } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default function AdminDashboard() {
  const db = getDb();

  const q = (sql: string, ...p: (number | string | null)[]) => (db.prepare(sql).get(...p) as unknown as { c: number }).c;

  const stats = {
    users: q('SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL'),
    learners: q("SELECT COUNT(*) c FROM users WHERE role='learner' AND deleted_at IS NULL"),
    courses: q('SELECT COUNT(*) c FROM courses WHERE is_published = 1 AND deleted_at IS NULL'),
    lessons: q('SELECT COUNT(*) c FROM lessons WHERE is_published = 1'),
    workshops: q('SELECT COUNT(*) c FROM workshops WHERE is_published = 1 AND deleted_at IS NULL'),
    enrollments: q("SELECT COUNT(*) c FROM enrollments WHERE status='active'"),
    certificates: q('SELECT COUNT(*) c FROM certificates WHERE revoked_at IS NULL'),
    openQuestions: q("SELECT COUNT(*) c FROM learner_questions WHERE status != 'resolved'"),
    aiRequests: q(`SELECT COUNT(*) c FROM ai_usage WHERE date(created_at) >= date('now','-7 day')`),
    communities: q('SELECT COUNT(*) c FROM communities WHERE deleted_at IS NULL'),
  };

  const newUsers = db
    .prepare("SELECT date(created_at) d, COUNT(*) c FROM users WHERE date(created_at) >= date('now','-13 day') GROUP BY d ORDER BY d")
    .all() as unknown as { d: string; c: number }[];
  const aiUse = db
    .prepare(`SELECT date(created_at) d, COUNT(*) c FROM ai_usage WHERE date(created_at) >= date('now','-13 day') GROUP BY d ORDER BY d`)
    .all() as unknown as { d: string; c: number }[];

  const courseStats = db
    .prepare(
      `SELECT c.title, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id=c.id) learners,
        (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id=p.lesson_id JOIN course_modules m ON m.id=l.module_id WHERE m.course_id=c.id AND p.completed_at IS NOT NULL) completions,
        (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id=l.module_id WHERE m.course_id=c.id AND l.is_published=1) lessons
       FROM courses c WHERE c.deleted_at IS NULL ORDER BY learners DESC`
    )
    .all() as unknown as { title: string; learners: number; completions: number; lessons: number }[];

  const workshopStats = db
    .prepare(
      `SELECT w.title, (SELECT COUNT(*) FROM workshop_registrations r WHERE r.workshop_id=w.id AND r.status IN ('CONFIRMED','PAID')) seats,
        (SELECT COUNT(*) FROM attendance a JOIN workshop_sessions s ON s.id=a.workshop_session_id WHERE s.workshop_id=w.id) attended
       FROM workshops w WHERE w.deleted_at IS NULL ORDER BY w.starts_at DESC`
    )
    .all() as unknown as { title: string; seats: number; attended: number }[];

  const knowledge = (() => {
    const docs = q(`SELECT COUNT(*) c FROM ai_knowledge_documents WHERE status='current'`);
    const stale = q(`SELECT COUNT(*) c FROM ai_knowledge_documents WHERE status='stale'`);
    const chunks = q('SELECT COUNT(*) c FROM ai_knowledge_chunks');
    const last = db.prepare('SELECT MAX(indexed_at) t FROM ai_knowledge_documents').get() as unknown as { t: string | null };
    return { docs, stale, chunks, last: last.t };
  })();

  const recentAudit = db
    .prepare('SELECT action, entity, actor_email, created_at FROM audit_logs ORDER BY id DESC LIMIT 6')
    .all() as unknown as { action: string; entity: string | null; actor_email: string | null; created_at: string }[];

  const maxUsers = Math.max(1, ...newUsers.map((x) => x.c));
  const maxAi = Math.max(1, ...aiUse.map((x) => x.c));

  return (
    <div>
      <PageHead title="Admin dashboard" subtitle="Real platform numbers — every card reads the database directly." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Users" value={stats.users} icon="👥" hint={`${stats.learners} learners`} />
        <StatCard label="Courses" value={stats.courses} icon="📚" hint={`${stats.lessons} lessons`} />
        <StatCard label="Workshops" value={stats.workshops} icon="🎤" />
        <StatCard label="Enrollments" value={stats.enrollments} icon="🌱" />
        <StatCard label="Certificates" value={stats.certificates} icon="🎓" />
        <StatCard label="Open questions" value={stats.openQuestions} icon="🙋" />
        <StatCard label="AI requests (7d)" value={stats.aiRequests} icon="🤖" />
        <StatCard label="Communities" value={stats.communities} icon="🌿" />
        <StatCard label="AI knowledge docs" value={knowledge.docs} icon="🧠" hint={`${knowledge.chunks} chunks`} />
        <div className="card flex flex-col justify-center p-4">
          <Link href="/admin/ai" className="text-sm font-semibold text-brand-700 hover:underline">
            {knowledge.stale > 0 ? `${knowledge.stale} docs stale → reindex` : `✓ Indexed ${knowledge.last ? fmtDate(knowledge.last) : ''}`}
          </Link>
        </div>
      </div>

      {/* Charts */}
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">New users (14 days)</h2>
          <BarChart data={newUsers.map((x) => ({ label: x.d.slice(5), value: x.c }))} max={maxUsers} color="bg-brand-500" />
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">AI tutor requests (14 days)</h2>
          <BarChart data={aiUse.map((x) => ({ label: x.d.slice(5), value: x.c }))} max={maxAi} color="bg-marigold-400" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Courses</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-400">
                <th className="pb-2">Course</th>
                <th className="pb-2">Learners</th>
                <th className="pb-2">Completions</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map((c) => (
                <tr key={c.title} className="border-b border-ink-50 last:border-b-0">
                  <td className="py-2.5 font-medium">{c.title}</td>
                  <td className="py-2.5">{c.learners}</td>
                  <td className="py-2.5">{c.completions}/{c.lessons} lessons</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Workshops</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-400">
                <th className="pb-2">Workshop</th>
                <th className="pb-2">Seats</th>
                <th className="pb-2">Attendance rows</th>
              </tr>
            </thead>
            <tbody>
              {workshopStats.map((w) => (
                <tr key={w.title} className="border-b border-ink-50 last:border-b-0">
                  <td className="py-2.5 font-medium">{w.title}</td>
                  <td className="py-2.5">{w.seats}</td>
                  <td className="py-2.5">{w.attended}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card mt-5 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-ink-400">Recent admin actions (audit log)</h2>
          <Link href="/admin/audit" className="text-xs font-semibold text-brand-700 hover:underline">View all →</Link>
        </div>
        {recentAudit.length === 0 ? (
          <p className="text-sm text-ink-500">No audited actions yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentAudit.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="info">{a.action}</Badge>
                {a.entity && <span className="text-ink-500">{a.entity}</span>}
                <span className="ml-auto text-xs text-ink-400">{a.actor_email} · {timeAgo(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BarChart({ data, max, color }: { data: { label: string; value: number }[]; max: number; color: string }) {
  if (data.length === 0) return <p className="py-8 text-center text-sm text-ink-400">No data yet.</p>;
  return (
    <div className="flex h-36 items-end gap-1" role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1" title={`${d.label}: ${d.value}`}>
          <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
          <span className="text-[9px] text-ink-400">{d.label.slice(3)}</span>
        </div>
      ))}
    </div>
  );
}
