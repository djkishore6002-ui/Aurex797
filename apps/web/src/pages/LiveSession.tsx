import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '@/lib/api';

export default function LiveSession() {
  const { id, sessionId } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [workshop, setWorkshop] = useState<any>(null);
  const [joined, setJoined] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const d = await api<any>(`/workshops/${id}`);
      setWorkshop(d.workshop);
      const s = d.sessions.find((x: any) => x.id === sessionId);
      setSession(s);
    })();
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [id, sessionId]);

  const join = async () => {
    await api(`/workshops/sessions/${sessionId}/checkin`, { method: 'POST' });
    setJoined(true);
    const start = Date.now();
    timer.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - start)/1000)), 1000);
  };

  const leave = async () => {
    await api(`/workshops/sessions/${sessionId}/leave`, { method: 'POST' });
    nav(`/workshops/${id}`);
  };

  if (!session) return <div className="p-8 text-center text-stone-500">Loading session…</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to={`/workshops/${id}`} className="text-sm text-stone-500">← Back</Link>
      <h1 className="text-2xl font-extrabold mt-2">{workshop?.title}</h1>
      <p className="text-stone-500 text-sm">Live session · {new Date(session.start_time).toLocaleString()}</p>

      <div className="mt-4 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="aspect-video bg-slate-900 relative flex items-center justify-center text-white">
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {joined && <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span><span className="text-xs font-bold">LIVE</span></>}
            </div>
            {joined ? (
              <>
                <div className="text-center">
                  <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-4xl pulse-ring">🎤</div>
                  <div className="mt-4 font-tamil text-2xl">வணக்கம்! Mic check — you're in.</div>
                  <div className="text-sm text-stone-400 mt-1">Join the external meeting below to connect with your instructor.</div>
                </div>
                <div className="absolute bottom-3 left-3 right-3 flex items-center gap-3 text-xs">
                  <span className="bg-white/10 px-2 py-1 rounded">⏱ {Math.floor(elapsed/60)}:{(elapsed%60).toString().padStart(2,'0')}</span>
                  <span className="flex-1"></span>
                  <a href={workshop.meeting_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-xs py-1.5 px-3">Open {workshop.meeting_url.includes('meet')?'Google Meet':'meeting'} ↗</a>
                </div>
              </>
            ) : (
              <div className="text-center">
                <div className="text-5xl">🔴</div>
                <div className="mt-3 font-bold">Ready to join?</div>
                <div className="text-sm text-stone-400">Click "Join session" to start your attendance tracking.</div>
              </div>
            )}
          </div>
        </div>
        <aside className="space-y-3">
          <div className="card p-5">
            <h3 className="font-bold">Session info</h3>
            <div className="text-sm text-stone-500 mt-2 space-y-1">
              <div>Start: {new Date(session.start_time).toLocaleString()}</div>
              <div>Duration: {session.duration_minutes} min</div>
              <div>Required: {session.required_minutes} min (for certificate)</div>
            </div>
            {!joined
              ? <button onClick={join} className="btn-primary w-full mt-4 pulse-ring">Join session</button>
              : <button onClick={leave} className="btn-danger w-full mt-4">Leave & save attendance</button>}
          </div>
          <div className="card p-5 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50">
            <h3 className="font-bold text-amber-900 dark:text-amber-200">Certificate rule</h3>
            <p className="text-sm text-amber-800 dark:text-amber-300 mt-2">Attend <b>90% or more</b> of required minutes across all sessions to earn a verifiable certificate. AI does not decide eligibility.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
