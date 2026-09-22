import { getDb, plainRows } from '@/db';
import { PageHead } from '@/components/ui';
import { fmtDate } from '@/lib/utils';
import { CertificatesAdmin } from './certificates-admin';

export const dynamic = 'force-dynamic';

export default function AdminCertificatesPage() {
  const db = getDb();
  const certificates = db
    .prepare(
      `SELECT c.*, u.email AS learner_email, w.title AS workshop_title, co.title AS course_title
       FROM certificates c JOIN users u ON u.id = c.user_id
       LEFT JOIN workshops w ON w.id = c.workshop_id LEFT JOIN courses co ON co.id = c.course_id
       ORDER BY c.issued_at DESC`
    )
    .all() as unknown as Record<string, unknown>[];
  const templates = plainRows<{ id: number; name: string; title_text: string; is_default: number; is_active: number }>(
    db.prepare('SELECT * FROM certificate_templates ORDER BY id').all()
  );

  return (
    <div>
      <PageHead title="Certificates" subtitle="Issued certificates, revocation and templates. Verification is public at /verify/{id}. Eligibility is always computed from the 90% rule — never by the AI." />
      <CertificatesAdmin
        certificates={certificates.map((c) => ({
          id: c.id as number,
          certificate_id: c.certificate_id as string,
          participant_name: c.participant_name as string,
          learner_email: c.learner_email as string,
          title_text: c.title_text as string,
          type: c.type as string,
          source_title: ((c.workshop_title ?? c.course_title) as unknown as string | null),
          attendance_percentage: (c.attendance_percentage as number | null),
          issued_at: fmtDate(c.issued_at as string),
          revoked_at: c.revoked_at as string | null,
        }))}
        templates={templates}
      />
    </div>
  );
}
