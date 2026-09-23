import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { CoursesAdmin } from './courses-admin';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

export default function AdminCoursesPage() {
  const db = getDb();
  const users = plainRows<{ id: number; name: string }>(
    db.prepare("SELECT id, name FROM users WHERE is_active = 1 AND deleted_at IS NULL AND role IN ('teacher','organizer') ORDER BY name").all()
  );
  const courses = plainRows<{
    id: number;
    slug: string;
    title: string;
    subtitle: string | null;
    description: string | null;
    difficulty: string;
    level_tag: string | null;
    price_cents: number;
    duration_hours: number;
    instructor_id: number | null;
    organizer_id: number | null;
    is_published: number;
    is_archived: number;
    sort_order: number;
    certificate_enabled: number;
    instructor_name: string | null;
    organizer_name: string | null;
    modules: number;
    published_lessons: number;
  }>(
    db
      .prepare(
        `SELECT c.id, c.slug, c.title, c.subtitle, c.description, c.difficulty, c.level_tag, c.price_cents, c.duration_hours,
          c.instructor_id, c.organizer_id, c.is_published, c.is_archived, c.sort_order, c.certificate_enabled,
          i.name AS instructor_name, o.name AS organizer_name,
          (SELECT COUNT(*) FROM course_modules m WHERE m.course_id = c.id) AS modules,
          (SELECT COUNT(*) FROM lessons l JOIN course_modules m ON m.id = l.module_id WHERE m.course_id = c.id AND l.is_published = 1) AS published_lessons
         FROM courses c LEFT JOIN users i ON i.id = c.instructor_id LEFT JOIN users o ON o.id = c.organizer_id
         WHERE c.deleted_at IS NULL ORDER BY c.sort_order, c.id`
      )
      .all()
  );

  return (
    <div>
      <PageHead title="Courses" subtitle="Create, edit, publish, duplicate, reorder, archive and delete courses. Modules, lessons, videos and quizzes are managed inside each course." />
      <CoursesAdmin courses={courses} staff={users} />
    </div>
  );
}
