import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, route } from '@/lib/api';

export async function GET() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    const certs = db
      .prepare(
        `SELECT c.*, w.title AS workshop_title, co.title AS course_title
         FROM certificates c
         LEFT JOIN workshops w ON w.id = c.workshop_id
         LEFT JOIN courses co ON co.id = c.course_id
         WHERE c.user_id = ? ORDER BY c.issued_at DESC`
      )
      .all(user.id);
    return json({ certificates: certs });
  });
}
