import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { json, route } from '@/lib/api';

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const params = new URL(req.url).searchParams;
    const days = Math.min(90, Math.max(1, Number(params.get('days') ?? 30)));

    const count = (sql: string, ...p: (string | number | null)[]) => (db.prepare(sql).get(...p) as unknown as { c: number }).c;

    const totals = {
      users: count('SELECT COUNT(*) c FROM users WHERE deleted_at IS NULL'),
      learners: count("SELECT COUNT(*) c FROM users WHERE role = 'learner' AND deleted_at IS NULL"),
      organizers: count("SELECT COUNT(*) c FROM users WHERE role = 'organizer' AND deleted_at IS NULL"),
      teachers: count("SELECT COUNT(*) c FROM users WHERE role = 'teacher' AND deleted_at IS NULL"),
      courses: count('SELECT COUNT(*) c FROM courses WHERE is_published = 1 AND deleted_at IS NULL'),
      lessons: count('SELECT COUNT(*) c FROM lessons WHERE is_published = 1'),
      workshops: count('SELECT COUNT(*) c FROM workshops WHERE is_published = 1 AND deleted_at IS NULL'),
      enrollments: count('SELECT COUNT(*) c FROM enrollments WHERE status = ?'),
      registrations: count("SELECT COUNT(*) c FROM workshop_registrations WHERE status IN ('CONFIRMED','PAID')"),
      certificates: count('SELECT COUNT(*) c FROM certificates WHERE revoked_at IS NULL'),
      openQuestions: count("SELECT COUNT(*) c FROM learner_questions WHERE status != 'resolved'"),
      communities: count('SELECT COUNT(*) c FROM communities WHERE deleted_at IS NULL'),
      posts: count('SELECT COUNT(*) c FROM posts WHERE deleted_at IS NULL AND is_hidden = 0'),
      aiRequests: count(`SELECT COUNT(*) c FROM ai_usage WHERE date(created_at) >= date('now', ?)`, `-${days} days`),
      aiTokens: db.prepare(`SELECT COALESCE(SUM(tokens_in) + SUM(tokens_out), 0) AS c FROM ai_usage WHERE date(created_at) >= date('now', ?)`).get(`-${days} days`) as unknown as { c: number },
    };

    // Daily series for charts
    const series = (sql: string, ...p: (string | number | null)[]) => db.prepare(sql).all(...p) as unknown as { d: string; c: number }[];
    const newUsers = series(
      `SELECT date(created_at) AS d, COUNT(*) c FROM users WHERE date(created_at) >= date('now', ?) GROUP BY d`,
      `-${days} days`
    );
    const aiUse = series(
      `SELECT date(created_at) AS d, COUNT(*) c FROM ai_usage WHERE date(created_at) >= date('now', ?) GROUP BY d`,
      `-${days} days`
    );
    const enrollSeries = series(
      `SELECT date(enrolled_at) AS d, COUNT(*) c FROM enrollments WHERE date(enrolled_at) >= date('now', ?) GROUP BY d`,
      `-${days} days`
    );

    // Enrollments per course
    const courseStats = db
      .prepare(
        `SELECT c.title, (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS learners,
          (SELECT COUNT(*) FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND p.completed_at IS NOT NULL) AS completions,
          (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND l.is_published = 1) AS lessons
         FROM courses c WHERE c.deleted_at IS NULL ORDER BY learners DESC`
      )
      .all() as unknown as { title: string; learners: number; completions: number; lessons: number }[];

    // Workshop attendance
    const workshopStats = db
      .prepare(
        `SELECT w.title, (SELECT COUNT(*) FROM workshop_registrations r WHERE r.workshop_id = w.id AND r.status IN ('CONFIRMED','PAID')) AS seats,
          (SELECT COUNT(*) FROM attendance a JOIN workshop_sessions s ON s.id = a.workshop_session_id WHERE s.workshop_id = w.id AND a.status = 'present') AS presentRows
         FROM workshops w WHERE w.deleted_at IS NULL ORDER BY w.starts_at DESC`
      )
      .all() as unknown as { title: string; seats: number; presentRows: number }[];

    // Question analytics (teacher difficulties)
    const questionStats = db
      .prepare(
        `SELECT COUNT(*) AS total,
          SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS unanswered,
          SUM(CASE WHEN ai_answer IS NOT NULL THEN 1 ELSE 0 END) AS aiAnswered,
          (SELECT COUNT(*) FROM teacher_answers) AS teacherAnswered
         FROM learner_questions`
      )
      .get() as unknown as { total: number; unanswered: number | null; aiAnswered: number | null; teacherAnswered: number | null };

    const recentCerts = db
      .prepare('SELECT certificate_id, participant_name, title_text, issued_at FROM certificates ORDER BY issued_at DESC LIMIT 8')
      .all();

    return json({ totals, newUsers, aiUse, enrollSeries, courseStats, workshopStats, questionStats, recentCerts });
  });
}
