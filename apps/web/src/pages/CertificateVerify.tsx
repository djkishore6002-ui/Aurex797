import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';
import QRCode from 'qrcode';

export default function CertificateVerify() {
  const { certNumber } = useParams();
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [qr, setQr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api<any>(`/certificates/verify/${certNumber}`);
        setData(d);
        const url = `${location.origin}/verify/${certNumber}`;
        setQr(await QRCode.toDataURL(url, { width: 250, margin: 1 }));
      } catch (e: any) { setErr(e.message); }
    })();
  }, [certNumber]);

  return (
    <div className="min-h-screen hero-grad flex items-center justify-center p-4">
      <div className="card p-8 max-w-2xl w-full shadow-xl animate-fade-in">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-xl">த</div>
          <div className="font-extrabold text-xl">Aurex Certificate Verification</div>
        </div>
        {err ? (
          <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-center">
            <div className="text-5xl">❌</div>
            <div className="text-red-700 dark:text-red-300 font-bold text-xl mt-3">Invalid Certificate</div>
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">{err}</div>
          </div>
        ) : data ? (
          <div>
            <div className="p-6 rounded-xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border-2 border-amber-200 dark:border-amber-900/50 text-center">
              <div className="text-4xl">🏅</div>
              <div className="mt-3 text-green-700 dark:text-green-300 font-bold text-lg">✓ VALID CERTIFICATE</div>
              <div className="mt-4 text-2xl font-extrabold">{data.name}</div>
              <div className="mt-1 text-sm text-stone-600 dark:text-stone-300">has successfully completed</div>
              <div className="text-xl font-bold mt-2 text-brand-700">{data.title}</div>
              <div className="mt-4 text-sm text-stone-600 dark:text-stone-300">Issued by <b>{data.issuer}</b></div>
              <div className="text-sm text-stone-600 dark:text-stone-300">Attendance: <b>{data.attendance_percent}%</b> · Issued {new Date(data.issued_at).toLocaleDateString()}</div>
              <div className="mt-4 inline-block bg-white p-3 rounded-xl shadow">
                {qr && <img src={qr} alt="QR verification" className="w-40 h-40"/>}
                <div className="mt-1 text-xs font-mono text-stone-500">{certNumber}</div>
              </div>
            </div>
          </div>
        ) : <div className="text-center text-stone-500">Verifying…</div>}
        <div className="mt-6 text-center">
          <Link to="/" className="btn-primary">Go to Aurex</Link>
        </div>
      </div>
    </div>
  );
}
