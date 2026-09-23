import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db';
import { verifyCertificate } from '@/lib/certificates';
import { fmtDate } from '@/lib/utils';
import { Badge } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  return { title: `Verify ${params.id}` };
}

export default function VerifyPage({ params }: { params: { id: string } }) {
  const db = getDb();
  const id = decodeURIComponent(params.id).toUpperCase();
  const cert = verifyCertificate(db, id);
  if (!cert) notFound();

  const valid = !cert.revoked_at;

  return (
    <div className="container-page flex justify-center py-12">
      <div className="w-full max-w-2xl">
        <div className={`card overflow-hidden ${valid ? '' : 'border-red-200'}`}>
          <div className={`flex items-center justify-center gap-3 px-6 py-6 text-center text-white ${valid ? 'bg-brand-700' : 'bg-red-600'}`}>
            <span aria-hidden className="text-3xl">{valid ? '✓' : '✕'}</span>
            <div>
              <h1 className="text-xl font-bold">{valid ? 'Valid Certificate' : 'Revoked Certificate'}</h1>
              <p className="text-sm opacity-90">{valid ? 'This certificate was issued by Solai and has not been revoked.' : 'This certificate has been revoked by the issuing institution.'}</p>
            </div>
          </div>

          <div className="p-8">
            {/* The certificate itself */}
            <div className={`relative overflow-hidden rounded-2xl border-4 p-8 text-center ${valid ? 'border-marigold-400/70 bg-gradient-to-br from-[#0e1226] via-[#151033] to-[#0a1225]' : 'border-red-300/60 bg-red-500/5'}`}>
              {valid && (
                <>
                  <div aria-hidden className="orb -top-16 -right-16 h-48 w-48 bg-brand-500/25" />
                  <div aria-hidden className="orb -bottom-20 -left-14 h-44 w-44 bg-marigold-400/15" />
                </>
              )}
              <div className="relative">
                <p className="tamil text-sm tracking-[0.3em] text-marigold-300/80">சோலை · SOLAI</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.25em] text-ink-400">{cert.template_title ?? cert.title_text}</p>
                <p className="tamil mt-6 text-2xl font-bold text-ink-700">This certifies that</p>
                <p className="text-gradient mt-3 text-3xl font-extrabold tracking-tight">{cert.participant_name}</p>
                <p className="mt-4 text-sm text-ink-400">{cert.template_body ?? 'is hereby recognized for successfully completing'}</p>
                <p className="mt-2 text-xl font-bold text-ink-950">{cert.title_text}</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-ink-300">
                  {cert.organizer_text && <span>👩‍ {cert.organizer_text}</span>}
                  {cert.duration_text && <span>⏱️ {cert.duration_text}</span>}
                  {cert.attendance_percentage != null && <span>📅 Attendance: {cert.attendance_percentage}%</span>}
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-1 border-t border-white/10 pt-5 text-xs text-ink-400">
                  <span>Issued {fmtDate(cert.issued_at)}</span>
                  <span>Certificate ID: <b className="text-brand-300">{cert.certificate_id}</b></span>
                  <span>Verified {fmtDate(new Date().toISOString())} · {cert.verificationCount}× checked</span>
                </div>
                {cert.template_signature && <p className="tamil mt-5 font-semibold text-marigold-200">{cert.template_signature}</p>}
              </div>
            </div>

            {cert.revoked_at && cert.revoked_reason && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <b>Reason for revocation:</b> {cert.revoked_reason}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-ink-400">
                Anyone can verify this certificate at this public URL. Scan the QR code on the certificate for the same page.
              </p>
              <Link href="/" className="btn-secondary">
                ← Back to Solai
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
