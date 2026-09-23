import { ProgressBar } from '@/components/ui';
import { checkCourseEligibility } from '@/lib/certificates';
import { getDb } from '@/db';

export function CourseProgress({ courseId, userId }: { courseId: number; userId: number }) {
  const db = getDb();
  const e = checkCourseEligibility(db, userId, courseId);
  const hasCert = db.prepare('SELECT certificate_id FROM certificates WHERE user_id = ? AND course_id = ? AND revoked_at IS NULL').get(userId, courseId) as unknown as { certificate_id: string } | null;
  return (
    <div className="w-full">
      <div className="mb-1.5 flex items-center justify-between text-sm text-brand-100">
        <span>
          Course progress: <b>{e.completedLessons}/{e.totalLessons} lessons</b>
        </span>
        <span className="font-bold">{e.percentage}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/20">
        <div className="h-full rounded-full bg-marigold-400 transition-[width] duration-700" style={{ width: `${e.percentage}%` }} />
      </div>
      <p className="mt-2 text-xs text-brand-200">
        {hasCert
          ? `🎓 Certificate issued — ${hasCert.certificate_id}`
          : e.eligible
            ? '🎉 Eligible for the course certificate — claim it from your dashboard!'
            : `Complete ${e.totalLessons - e.completedLessons} more lesson${e.totalLessons - e.completedLessons === 1 ? '' : 's'} to reach the 90% certificate requirement.`}
      </p>
    </div>
  );
}
