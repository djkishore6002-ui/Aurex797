import { getDb } from '@/db';
import { json, route } from '@/lib/api';
import { verifyCertificate } from '@/lib/certificates';
import QRCode from 'qrcode';

/** Returns a data-URL QR code encoding the public verification link. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return route(async () => {
    const db = getDb();
    const id = decodeURIComponent(params.id).toUpperCase();
    const cert = db.prepare('SELECT certificate_id, revoked_at FROM certificates WHERE certificate_id = ?').get(id) as unknown as { certificate_id: string; revoked_at: string | null } | undefined;
    if (!cert) return json({ error: 'Certificate not found' }, 404);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
    const url = `${base.replace(/\/$/, '')}/verify/${cert.certificate_id}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2, color: { dark: '#1d3629', light: '#ffffff' } });
    return json({ url, qr: dataUrl, valid: !cert.revoked_at });
  });
}
