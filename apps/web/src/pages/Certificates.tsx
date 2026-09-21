import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';
import QRCode from 'qrcode';

export default function Certificates() {
  const { number } = useParams();
  const [items, setItems] = useState<any[]>([]);
  const [verify, setVerify] = useState<any>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [verifyInput, setVerifyInput] = useState(number || '');
  const qrRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { api('/certificates/mine').then((d: any) => setItems(d.items)); }, []);
  useEffect(() => {
    if (number) runVerify(number);
    // eslint-disable-next-line
  }, [number]);

  const runVerify = async (cn: string) => {
    try {
      const d = await api<any>(`/certificates/verify/${cn}`);
      setVerify(d);
      const url = `${location.origin}/verify/${cn}`;
      const data = await QRCode.toDataURL(url, { width: 200, margin: 1 });
      setQrUrl(data);
    } catch (e: any) {
      setVerify({ valid: false, error: e.message });
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">🏅 Certificates</h1>
      <p className="text-stone-500 mt-1">Earned by attending 90%+ of workshop minutes. Each has a verifiable QR code.</p>

      <div className="card p-5 mt-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <input className="input flex-1" placeholder="Enter certificate ID to verify" value={verifyInput} onChange={e=>setVerifyInput(e.target.value)} />
          <button onClick={() => { runVerify(verifyInput); history.pushState({}, '', `/certificates/${verifyInput}`); }} className="btn-primary">Verify</button>
        </div>
        {verify && (
          <div className={`mt-4 p-5 rounded-xl ${verify.valid?'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900':'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900'}`}>
            {verify.valid ? (
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                  <div className="text-green-700 dark:text-green-300 font-bold text-lg">✓ VALID CERTIFICATE</div>
                  <div className="mt-3 grid sm:grid-cols-2 gap-2 text-sm">
                    <div><div className="text-stone-500">Name</div><div className="font-semibold">{verify.name}</div></div>
                    <div><div className="text-stone-500">Course / Workshop</div><div className="font-semibold">{verify.title}</div></div>
                    <div><div className="text-stone-500">Issuer</div><div className="font-semibold">{verify.issuer}</div></div>
                    <div><div className="text-stone-500">Attendance</div><div className="font-semibold">{verify.attendance_percent}%</div></div>
                    <div><div className="text-stone-500">Issued</div><div className="font-semibold">{new Date(verify.issued_at).toLocaleDateString()}</div></div>
                    <div><div className="text-stone-500">Certificate ID</div><div className="font-mono">{verifyInput}</div></div>
                  </div>
                </div>
                {qrUrl && <img src={qrUrl} alt="QR" className="bg-white p-3 rounded-xl shadow" />}
              </div>
            ) : (
              <div className="text-red-700 dark:text-red-300 font-bold">✗ {verify.error || 'Invalid or revoked certificate.'}</div>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        {items.map((c: any) => (
          <div key={c.id} className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-900/20 dark:to-rose-900/20 border-2 border-amber-200 dark:border-amber-900/50 shadow-lg">
            <div className="absolute top-3 right-3 text-3xl opacity-30">🏅</div>
            <div className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300 font-bold">Aurex Certificate</div>
            <div className="mt-2 font-extrabold text-xl">{c.title}</div>
            <div className="mt-4 text-sm">Awarded to</div>
            <div className="text-xl font-tamil font-bold text-brand-700"></div>
            <div className="text-xl font-bold">{/* name will load via verify */}<button onClick={()=>runVerify(c.cert_number)} className="text-brand-700 underline">View & verify</button></div>
            <div className="mt-4 flex items-end justify-between text-xs text-stone-600 dark:text-stone-400">
              <div>Issued {new Date(c.issued_at).toLocaleDateString()}<br/>Attendance {c.attendance_percent}%</div>
              <div className="font-mono bg-white/70 dark:bg-black/20 px-2 py-1 rounded">{c.cert_number}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-stone-500 col-span-2 text-center p-8">You haven't earned any certificates yet. Join a workshop and attend 90%+ of sessions to earn one.</div>}
      </div>
      <canvas ref={qrRef} className="hidden" />
      <div className="mt-4 text-sm text-stone-500"><Link to="/workshops" className="text-brand-600 font-semibold">Browse workshops →</Link></div>
    </div>
  );
}
