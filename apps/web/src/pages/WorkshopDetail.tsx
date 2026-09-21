import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '@/lib/api';

export default function WorkshopDetail() {
  const { id } = useParams();
  const [d, setD] = useState<any>(null);
  const [att, setAtt] = useState<any>(null);
  const [reg, setReg] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const w = await api<any>(`/workshops/${id}`);
    setD(w);
    try {
      const mine = await api<any>(`/workshops/${id}/my-attendance`);
      setAtt(mine);
      setReg(true);
    } catch { setReg(false); setAtt(null); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const register = async () => {
    setBusy(true);
    try { await api(`/workshops/${id}/register`, { method: 'POST' }); await load(); }
    catch (e: any) { alert(e.message); }
    setBusy(false);
  };

  if (!d) return <div className="p-8 text-center text-stone-500">Loading…</div>;
  const { workshop, sessions } = d;

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to="/workshops" className="text-sm text-stone-500">← Workshops</Link>
      <div className="card mt-4 overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-7xl">🎓</div>
        <div className="p-6">
          <h1 className="text-3xl font-extrabold">{workshop.title}</h1>
          <p className="text-stone-600 dark:text-stone-300 mt-2">{workshop.description}</p>
          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
            <Info label="Instructor" value={d.workshop.instructor_name} />
            <Info label="Capacity" value={`${d.registered}/${workshop.capacity}`} />
            <Info label="Type" value={workshop.is_paid ? `Paid — $${workshop.price}` : 'Free'} />
            <Info label="Sessions" value={sessions.length.toString()} />
          </div>
          <div className="mt-5 flex gap-3 flex-wrap">
            {reg ? <span className="badge bg-green-100 text-green-700 px-3 py-1.5">✓ Registered</span>
                : <button onClick={register} disabled={busy} className="btn-primary">{busy?'Registering…':'Register — Free'}</button>}
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mt-8 mb-4">Sessions</h2>
      <div className="space-y-3">
        {sessions.map((s: any) => {
          const myAtt = att?.sessions?.find((x: any) => x.id === s.id);
          const now = Date.now();
          const start = new Date(s.start_time).getTime();
          const end = new Date(s.end_time).getTime();
          const isLive = now >= start && now <= end;
          const upcoming = now < start;
          return (
            <div key={s.id} className="card p-5 flex flex-wrap items-center gap-4">
              <div className="w-14 text-center">
                <div className="text-xs text-stone-500">{new Date(s.start_time).toLocaleDateString(undefined,{month:'short'})}</div>
                <div className="text-2xl font-extrabold">{new Date(s.start_time).getDate()}</div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="font-semibold">{new Date(s.start_time).toLocaleString()}</div>
                <div className="text-xs text-stone-500">Duration: {s.duration_minutes} min · Required: {s.required_minutes} min</div>
                {myAtt && (
                  <div className="text-xs mt-1">
                    <span className={`badge ${myAtt.status==='present'?'bg-green-100 text-green-700':myAtt.status==='partial'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                      {myAtt.status} · {Math.round(myAtt.duration_minutes)} min
                    </span>
                  </div>
                )}
              </div>
              {reg && isLive && <Link to={`/workshops/${id}/live/${s.id}`} className="btn-primary pulse-ring">🔴 Join live</Link>}
              {reg && upcoming && <span className="badge bg-stone-100 dark:bg-slate-800">Upcoming</span>}
              {!upcoming && !isLive && <span className="badge bg-stone-100 dark:bg-slate-800">Ended</span>}
            </div>
          );
        })}
      </div>

      {reg && att && (
        <div className="card p-6 mt-6 bg-gradient-to-br from-brand-50 to-white dark:from-brand-900/20 dark:to-slate-900">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-sm text-stone-500">Your attendance</div>
              <div className="text-3xl font-extrabold">{att.attendance_percent}%</div>
            </div>
            <div>
              {att.eligible
                ? <div className="text-right"><span className="badge bg-green-100 text-green-700 text-sm">✓ Certificate eligible</span>{att.certificate && <div className="mt-1 text-xs text-stone-500">Cert: {att.certificate.cert_number}</div>}</div>
                : <div className="text-right"><span className="badge bg-amber-100 text-amber-700 text-sm">Not yet eligible</span><div className="mt-1 text-xs text-stone-500">Required: {att.required}%</div></div>}
            </div>
          </div>
          <div className="progress-track mt-3 h-3"><div className="progress-fill" style={{width:`${att.attendance_percent}%`}}></div></div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-stone-50 dark:bg-slate-900 rounded-lg">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
