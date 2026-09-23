import { z } from 'zod';
import { getDb } from '@/db';
import { requireRole } from '@/lib/auth';
import { ApiError, json, readJson, route } from '@/lib/api';
import { audit } from '@/lib/audit';
import { revokeCertificate } from '@/lib/certificates';

export async function GET(req: Request) {
  return route(async () => {
    requireRole('super_admin');
    const db = getDb();
    const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
    const certs = db
      .prepare(
        `SELECT c.*, u.email, w.title AS workshop_title, co.title AS course_title
         FROM certificates c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN workshops w ON w.id = c.workshop_id
         LEFT JOIN courses co ON co.id = c.course_id
         WHERE (? = '' OR c.certificate_id LIKE ? OR c.participant_name LIKE ?)
         ORDER BY c.issued_at DESC LIMIT 200`
      )
      .all(q, `%${q}%`, `%${q}%`);
    const templates = db.prepare('SELECT * FROM certificate_templates ORDER BY id').all();
    return json({ certificates: certs, templates });
  });
}

export async function PUT(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { certificate_id: string; reason: string };
    const certId = z.string().trim().min(6).max(30).parse(body.certificate_id);
    const reason = z.string().trim().min(5).max(500).parse(body.reason);
    const db = getDb();
    revokeCertificate(db, certId.toUpperCase(), reason);
    audit(admin, 'CERTIFICATE_REVOKED', { entity: 'certificate', next: { certificate_id: certId.toUpperCase(), reason } });
    return json({ ok: true });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const admin = requireRole('super_admin');
    const body = (await readJson(req)) as unknown as { name: string; title_text: string; body_text?: string; signature_text?: string; background_style?: string; is_default?: number };
    const db = getDb();
    db.prepare(
      `INSERT INTO certificate_templates (name, title_text, body_text, signature_text, background_style, is_default)
       VALUES (?,?,?,?,?,?)`
    ).run(
      z.string().trim().min(2).max(120).parse(body.name),
      z.string().trim().min(3).max(160).parse(body.title_text),
      body.body_text ?? 'is hereby recognized for successfully completing',
      body.signature_text ?? 'Solai Academy',
      body.background_style ?? 'classic',
      body.is_default ? 1 : 0
    );
    audit(admin, 'ADMIN_CREATED_CERT_TEMPLATE', { next: { name: body.name } });
    return json({ ok: true }, 201);
  });
}
