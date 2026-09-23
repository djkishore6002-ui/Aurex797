import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { Blocks } from '@/components/Blocks';
import { Badge, PageHead, ProgressBar } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth';
import { formatDuration } from '@/lib/utils';
import { LessonVideo } from '@/components/LessonVideo';
import { TutorContextBridge } from '@/components/TutorContextBridge';
import { VocabCardClient } from '@/components/VocabCard';
import { LessonSidebar } from './lesson-sidebar';
import { LessonTools } from './lesson-tools';

export const dynamic = process.env.SOLAI_STATIC === '1' ? undefined : 'force-dynamic';

/**
 * Static snapshot (GitHub Pages): prerender every published lesson.
 * In the live (server) app this returns [] so the page stays
 * `force-dynamic` and always reflects current enrollment state.
 */
export const generateStaticParams: () => { courseSlug: string; lessonSlug: string }[] =
  process.env.SOLAI_STATIC === '1'
    ? () => {
        const db = getDb();
        const rows = db
          .prepare(
            `SELECT c.slug AS courseSlug, l.slug AS lessonSlug
             FROM courses c
             JOIN course_modules m ON m.course_id = c.id AND m.is_published = 1
             JOIN lessons l ON l.module_id = m.id AND l.is_published = 1
             WHERE c.is_published = 1 AND c.deleted_at IS NULL`
          )
          .all() as unknown as { courseSlug: string; lessonSlug: string }[];
        return rows;
      }
    : () => [];

export async function generateMetadata({ params }: { params: { courseSlug: string; lessonSlug: string } }): Promise<Metadata> {
  const db = getDb();
  const l = db
    .prepare('SELECT l.title FROM lessons l JOIN course_modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id WHERE l.slug = ? AND c.slug = ?')
    .get(params.lessonSlug, params.courseSlug) as unknown as { title: string } | undefined;
  return { title: l?.title ?? 'Lesson not found' };
}

export default function LessonPage({ params }: { params: { courseSlug: string; lessonSlug: string } }) {
  const db = getDb();
  const course = db.prepare('SELECT * FROM courses WHERE slug = ?').get(params.courseSlug) as unknown as { id: number; title: string; slug: string } | undefined;
  if (!course) notFound();
  const lesson = db
    .prepare(
      `SELECT l.*, m.title AS module_title, m.sort_order AS module_order
       FROM lessons l JOIN course_modules m ON m.id = l.module_id
       WHERE m.course_id = ? AND l.slug = ?`
    )
    .get(course.id, params.lessonSlug) as
    | (Record<string, unknown> & {
        id: number;
        slug: string;
        title: string;
        summary: string | null;
        content_json: string;
        video_url: string | null;
        video_duration_seconds: number;
        audio_url: string | null;
        pdf_url: string | null;
        transcript_text: string | null;
        chapters_json: string | null;
        is_published: number;
        sort_order: number;
        xp: number;
        required_watch_percent: number;
        module_title: string;
      })
    | undefined;
  if (!lesson || !lesson.is_published) notFound();

  let blocks: unknown = [];
  try {
    blocks = JSON.parse(lesson.content_json);
  } catch {
    blocks = [];
  }
  let chapters: { title: string; seconds: number }[] = [];
  try {
    chapters = lesson.chapters_json ? (JSON.parse(lesson.chapters_json) as unknown as { title: string; seconds: number }[]) : [];
  } catch {
    chapters = [];
  }

  const vocab = db
    .prepare('SELECT * FROM vocabulary WHERE lesson_id = ? AND is_published = 1')
    .all(lesson.id) as unknown as { id: number; tamil: string; transliteration: string; meaning: string; example_tamil: string | null; example_meaning: string | null }[];

  const quiz = db.prepare('SELECT id, title FROM quizzes WHERE lesson_id = ? AND is_published = 1').get(lesson.id) as unknown as { id: number; title: string } | null;

  // Free resources for this course (NPTEL / YouTube / Alison / notes)
  const freeResources = db
    .prepare(
      `SELECT * FROM learning_resources WHERE is_published = 1 AND (lesson_id = ? OR (course_id = ? AND lesson_id IS NULL)) ORDER BY sort_order, id LIMIT 6`
    )
    .all(lesson.id, course.id) as unknown as {
    id: number;
    title: string;
    title_tamil: string | null;
    type: string;
    provider: string;
    url: string;
    youtube_id: string | null;
  }[];

  const user = getCurrentUser();
  const progress = user
    ? (db.prepare('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?').get(user.id, lesson.id) as unknown as { completion_percentage: number; last_position: number; completed_at: string | null } | null)
    : null;

  const enrolled = user ? db.prepare('SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = ?').get(user.id, course.id, 'active') : null;

  const siblingLessons = db
    .prepare(
      `SELECT l.slug, l.title, m.sort_order AS module_order, l.sort_order
       FROM lessons l JOIN course_modules m ON m.id = l.module_id
       WHERE m.course_id = ? AND l.is_published = 1 ORDER BY m.sort_order, l.sort_order`
    )
    .all(course.id) as unknown as { slug: string; title: string; module_order: number; sort_order: number }[];
  const idx = siblingLessons.findIndex((l) => l.slug === lesson.slug);
  const prev = idx > 0 ? siblingLessons[idx - 1] : null;
  const next = idx >= 0 && idx < siblingLessons.length - 1 ? siblingLessons[idx + 1] : null;

  const vocabText = vocab.map((v) => `${v.tamil} (${v.transliteration}) = ${v.meaning}${v.example_tamil ? ` — ${v.example_tamil} (${v.example_meaning ?? ''})` : ''}`).join('\n');

  return (
    <div className="container-page py-8">
      <TutorContextBridge
        context={{
          type: 'lesson',
          id: lesson.id,
          label: lesson.title,
          text: [lesson.summary ?? '', typeof blocks === 'string' ? blocks : JSON.stringify(blocks ?? '').slice(0, 600), vocabText, lesson.transcript_text ?? ''].join('\n').slice(0, 2000),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-400">
        <Link href="/learn" className="hover:text-brand-700">Courses</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <Link href={`/learn/${course.slug}`} className="hover:text-brand-700">{course.title}</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-ink-700">{lesson.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <PageHead
            title={lesson.title}
            subtitle={lesson.summary}
            actions={
              <div className="flex items-center gap-2">
                <Badge tone="success">+{lesson.xp} XP</Badge>
                {lesson.video_url && <Badge>🎬 {lesson.video_duration_seconds ? formatDuration(lesson.video_duration_seconds) : 'Video'}</Badge>}
                {progress?.completed_at && <Badge tone="success">✓ Completed</Badge>}
              </div>
            }
          />

          {user && progress && (
            <div className="mb-6">
              <div className="mb-1 flex items-center justify-between text-xs text-ink-500">
                <span>Your progress on this lesson</span>
                <span className="font-semibold">{Math.round(progress.completion_percentage)}%</span>
              </div>
              <ProgressBar value={progress.completion_percentage} />
            </div>
          )}

          {lesson.video_url && (
            <div className="mb-8">
              <LessonVideo
                src={lesson.video_url}
                lessonId={lesson.id}
                initialPosition={progress?.last_position ?? 0}
                chapters={chapters}
                requiredWatchPercent={lesson.required_watch_percent}
              />
              {lesson.transcript_text && <Transcript text={lesson.transcript_text} />}
              {lesson.audio_url && (
                <div className="mt-3 rounded-xl border border-ink-200 bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-ink-700">🎧 Audio</p>
                  <audio src={lesson.audio_url} controls className="w-full" />
                </div>
              )}
              {lesson.pdf_url && (
                <div className="mt-3">
                  <a href={lesson.pdf_url} className="btn-secondary" target="_blank" rel="noreferrer">
                    📄 Download lesson PDF
                  </a>
                </div>
              )}
            </div>
          )}

          <Blocks blocks={blocks} />

          {vocab.length > 0 && user && (
            <section className="mt-10" aria-label="Lesson vocabulary">
              <h2 className="mb-4 text-lg font-bold">📝 Vocabulary in this lesson</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {vocab.map((v) => (
                  <VocabCard key={v.id} vocab={v} userId={user.id} />
                ))}
              </div>
            </section>
          )}

          <div className="mt-10 rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-ink-950">Finished this lesson?</h2>
                <p className="mt-1 text-sm text-ink-600">
                  {lesson.video_url
                    ? `Watch ${lesson.required_watch_percent}% of the video to complete it — the player tracks this automatically.`
                    : 'Read through and mark it complete to earn your XP.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!progress?.completed_at && user && (
                  <LessonTools lessonId={lesson.id} hasVideo={!!lesson.video_url} />
                )}
                {quiz && (
                  <Link href={`/learn/${course.slug}/${lesson.slug}?quiz=${quiz.id}`} className="btn-primary">
                    🧠 Take the quiz
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Free resources for this course (NPTEL / YouTube / Alison) */}
          {freeResources.length > 0 && (
            <section className="mt-10" aria-label="Free resources">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold text-ink-950">📚 Free resources for this course</h2>
                <Link href="/resources" className="text-xs font-semibold text-brand-300 hover:underline">
                  Full library →
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {freeResources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card group flex items-center gap-3 p-4 transition hover:border-brand-400/40"
                  >
                    <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg">
                      {r.youtube_id ? '▶' : r.type === 'video' || r.type === 'playlist' ? '🎬' : r.type === 'course' ? '🎓' : r.type === 'note' ? '📝' : r.type === 'book' ? '📕' : r.type === 'article' ? '📰' : '🧭'}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-ink-100 group-hover:text-brand-200">
                        {r.title_tamil || r.title}
                      </span>
                      <span className="block truncate text-[11px] text-ink-500">
                        {r.title} · <span className="uppercase">{r.provider}</span>
                      </span>
                    </span>
                    <span aria-hidden className="ml-auto text-ink-500 transition group-hover:translate-x-0.5">↗</span>
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Prev / next */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {prev ? (
              <Link href={`/learn/${course.slug}/${prev.slug}`} className="card p-4 transition-shadow hover:shadow-md">
                <p className="text-xs text-ink-400">← Previous</p>
                <p className="mt-1 truncate text-sm font-semibold">{prev.title}</p>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`/learn/${course.slug}/${next.slug}`} className="card p-4 text-right transition-shadow hover:shadow-md">
                <p className="text-xs text-ink-400">Next →</p>
                <p className="mt-1 truncate text-sm font-semibold">{next.title}</p>
              </Link>
            )}
          </div>
        </div>

        <LessonSidebar courseId={course.id} courseSlug={course.slug} currentLessonSlug={lesson.slug} enrolled={!!enrolled} userId={user?.id ?? null} />
      </div>
    </div>
  );
}

function Transcript({ text }: { text: string }) {
  return (
    <details className="mt-3 rounded-xl border border-ink-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink-700">📄 Transcript</summary>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-600">{text}</p>
    </details>
  );
}

function VocabCard({ vocab, userId }: { vocab: { id: number; tamil: string; transliteration: string; meaning: string; example_tamil: string | null; example_meaning: string | null }; userId: number }) {
  return <VocabCardClient vocabId={vocab.id} tamil={vocab.tamil} translit={vocab.transliteration} meaning={vocab.meaning} example={vocab.example_tamil} exampleMeaning={vocab.example_meaning} userId={userId} />;
}
