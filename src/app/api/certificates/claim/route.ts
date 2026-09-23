import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { issueCertificate } from '@/lib/certificates';
import { audit } from '@/lib/audit';

/**
 * Learner claims a certificate they are deterministically eligible for.
 * Eligibility is computed from the database (90% rule) — never from the client
 * or from the AI.
 */
export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = (await readJson(req)) as unknown as { type: 'course' | 'workshop'; course_id?: number; workshop_id?: number };
    z.enum(['course', 'workshop']).parse(body.type);
    const db = getDb();

    try {
      const { certificate_id } = issueCertificate(db, {
        userId: user.id,
        type: body.type,
        courseId: body.course_id ?? null,
        workshopId: body.workshop_id ?? null,
      });
      audit(user, 'LEARNER_CLAIMED_CERTIFICATE', { entity: 'certificate', entity_id: undefined, next: { certificate_id } });
      return json({ ok: true, certificate_id, verify_url: `/verify/${certificate_id}` }, 201);
    } catch (e) {
      throw new ApiError(400, e instanceof Error ? e.message : 'Could not issue certificate');
    }
  });
}
