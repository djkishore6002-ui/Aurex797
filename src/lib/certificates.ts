import type { DB } from '@/db';
import { workshopAttendanceSummary } from './attendance';

/*
 * CERTIFICATES — IDs, deterministic eligibility and verification.
 * Eligibility is ALWAYS computed from database records. The AI can
 * explain the rule but can never issue, promise or override eligibility.
 */

export function nextCertificateId(db: DB): string {
  const year = new Date().getUTCFullYear();
  const row = db
    .prepare("SELECT MAX(CAST(SUBSTR(certificate_id, 9) AS INTEGER)) AS max FROM certificates WHERE certificate_id LIKE ?")
    .get(`TN-${year}-%`) as unknown as { max: number | null };
  const seq = (row.max ?? 0) + 1;
  return `TN-${year}-${String(seq).padStart(6, '0')}`;
}

export interface CourseEligibility {
  eligible: boolean;
  completedLessons: number;
  totalLessons: number;
  percentage: number;
  rule: string;
}

export function checkCourseEligibility(db: DB, userId: number, courseId: number): CourseEligibility {
  const total = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM lessons l JOIN course_modules m ON m.id = l.module_id
         WHERE m.course_id = ? AND l.is_published = 1`
      )
      .get(courseId) as unknown as { c: number }
  ).c;
  const completed = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM lesson_progress p
         JOIN lessons l ON l.id = p.lesson_id JOIN course_modules m ON m.id = l.module_id
         WHERE m.course_id = ? AND p.user_id = ? AND p.completed_at IS NOT NULL`
      )
      .get(courseId, userId) as unknown as { c: number }
  ).c;
  const percentage = total > 0 ? Math.round((completed / total) * 1000) / 10 : 0;
  return {
    eligible: total > 0 && percentage >= 90,
    completedLessons: completed,
    totalLessons: total,
    percentage,
    rule: 'Complete at least 90% of the published lessons in this course.',
  };
}

export interface WorkshopEligibility {
  eligible: boolean;
  percentage: number;
  totalRequiredMinutes: number;
  totalAttendedMinutes: number;
  rule: string;
}

export function checkWorkshopEligibility(db: DB, userId: number, workshopId: number): WorkshopEligibility {
  const s = workshopAttendanceSummary(db, workshopId, userId);
  return {
    eligible: s.eligible,
    percentage: s.percentage,
    totalRequiredMinutes: s.totalRequiredMinutes,
    totalAttendedMinutes: s.totalAttendedMinutes,
    rule: 'Attend at least 90% of the total required minutes across all sessions.',
  };
}

export interface IssueCertificateInput {
  userId: number;
  type: 'course' | 'workshop';
  courseId?: number | null;
  workshopId?: number | null;
  templateId?: number | null;
}

export function issueCertificate(db: DB, input: IssueCertificateInput): { certificate_id: string } {
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(input.userId) as unknown as { name: string } | undefined;
  if (!user) throw new Error('User not found');

  let title = '';
  let organizer = '';
  let duration = '';
  let attendance: number | null = null;
  let eligibility = false;

  if (input.type === 'course' && input.courseId) {
    const course = db.prepare('SELECT title, duration_hours, certificate_enabled FROM courses WHERE id = ?').get(input.courseId) as unknown as { title: string; duration_hours: number; certificate_enabled: number } | undefined;
    if (!course) throw new Error('Course not found');
    if (!course.certificate_enabled) throw new Error('Certificates are disabled for this course');
    const e = checkCourseEligibility(db, input.userId, input.courseId);
    eligibility = e.eligible;
    title = course.title;
    duration = `${Math.round(course.duration_hours)} hours`;
    const inst = db
      .prepare('SELECT u.name FROM courses c JOIN users u ON u.id = c.instructor_id WHERE c.id = ?')
      .get(input.courseId) as unknown as { name: string } | undefined;
    organizer = inst?.name ?? 'Solai Academy';
    attendance = e.percentage;
  } else if (input.type === 'workshop' && input.workshopId) {
    const w = db.prepare('SELECT title, duration_minutes, certificate_enabled FROM workshops WHERE id = ?').get(input.workshopId) as unknown as { title: string; duration_minutes: number; certificate_enabled: number } | undefined;
    if (!w) throw new Error('Workshop not found');
    if (!w.certificate_enabled) throw new Error('Certificates are disabled for this workshop');
    const e = checkWorkshopEligibility(db, input.userId, input.workshopId);
    eligibility = e.eligible;
    title = w.title;
    duration = `${w.duration_minutes} minutes`;
    const inst = db
      .prepare('SELECT u.name FROM workshops w JOIN users u ON u.id = w.instructor_id WHERE w.id = ?')
      .get(input.workshopId) as unknown as { name: string } | undefined;
    organizer = inst?.name ?? 'Solai Academy';
    attendance = e.percentage;
  } else {
    throw new Error('Invalid certificate type');
  }

  if (!eligibility) {
    throw new Error('Eligibility requirements not met (90% rule). The certificate was NOT issued.');
  }

  // Idempotent: don't issue twice for the same user+entity
  const existing = db
    .prepare('SELECT certificate_id FROM certificates WHERE user_id = ? AND type = ? AND (course_id = ? OR workshop_id = ?) AND revoked_at IS NULL')
    .get(input.userId, input.type, input.courseId ?? -1, input.workshopId ?? -1) as unknown as { certificate_id: string } | undefined;
  if (existing) return existing;

  const template =
    (input.templateId ? (db.prepare('SELECT * FROM certificate_templates WHERE id = ? AND is_active = 1').get(input.templateId) as unknown as { id: number } | undefined) : undefined) ??
    (db.prepare('SELECT id FROM certificate_templates WHERE is_default = 1 AND is_active = 1').get() as unknown as { id: number } | undefined);

  const certificateId = nextCertificateId(db);
  db.prepare(
    `INSERT INTO certificates (certificate_id, user_id, type, course_id, workshop_id, template_id, participant_name, title_text, organizer_text, duration_text, attendance_percentage)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`
  ).run(certificateId, input.userId, input.type, input.courseId ?? null, input.workshopId ?? null, template?.id ?? null, user.name, title, organizer, duration, attendance);

  db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)').run(
    input.userId,
    'certificate',
    'Certificate issued 🎓',
    `Congratulations! Your certificate for "${title}" has been issued.`,
    `/verify/${certificateId}`
  );
  return { certificate_id: certificateId };
}

export function revokeCertificate(db: DB, certificateId: string, reason: string): void {
  const cert = db.prepare('SELECT * FROM certificates WHERE certificate_id = ?').get(certificateId) as unknown as { user_id: number; title_text: string; revoked_at: string | null } | undefined;
  if (!cert) throw new Error('Certificate not found');
  if (cert.revoked_at) throw new Error('Certificate is already revoked');
  db.prepare("UPDATE certificates SET revoked_at = datetime('now'), revoked_reason = ? WHERE certificate_id = ?").run(reason, certificateId);
  db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)').run(
    cert.user_id,
    'certificate',
    'Certificate revoked',
    `Your certificate for "${cert.title_text}" was revoked. Reason: ${reason}`,
    `/verify/${certificateId}`
  );
}

export function verifyCertificate(db: DB, certificateId: string, ip?: string) {
  const cert = db
    .prepare(
      `SELECT cert.*, tpl.title_text AS template_title, tpl.body_text AS template_body, tpl.signature_text AS template_signature, tpl.background_style
       FROM certificates cert LEFT JOIN certificate_templates tpl ON tpl.id = cert.template_id
       WHERE cert.certificate_id = ?`
    )
    .get(certificateId.toUpperCase()) as
    | {
        id: number;
        certificate_id: string;
        user_id: number;
        type: string;
        participant_name: string;
        title_text: string;
        organizer_text: string | null;
        duration_text: string | null;
        attendance_percentage: number | null;
        issued_at: string;
        revoked_at: string | null;
        revoked_reason: string | null;
        template_title: string | null;
        template_body: string | null;
        template_signature: string | null;
        background_style: string | null;
      }
    | undefined;
  if (!cert) return null;
  db.prepare('INSERT INTO certificate_verifications (certificate_id, ip) VALUES (?,?)').run(cert.id, ip ?? null);
  const verifications = (db.prepare('SELECT COUNT(*) AS c FROM certificate_verifications WHERE certificate_id = ?').get(cert.id) as unknown as { c: number }).c;
  return { ...cert, verificationCount: verifications };
}
