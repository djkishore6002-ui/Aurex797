import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '@/lib/api';

export default function OrganizerAttendance() {
  const { id } = useParams();
  const [d, setD] = useState<any>(null);
  useEffect(() => { if(id) api(`/workshops/${id}/attendance`).then(setD); }, [id]);
  if (!d) return <div className="p-8 text-center text-stone-500">Loading…</div>;
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <Link to="/organizer/workshops" className="text-sm text-stone-500">← Workshops</Link>
      <h1 className="text-3xl font-extrabold mt-2">{d.workshop.title} — Attendance</h1>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 dark:bg-slate-900 text-left">
            <tr>
              <th className="p-3">Learner</th><th className="p-3">Attendance</th><th className="p-3">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {d.roster.map((r: any) => (
              <tr key={r.user_id} className="border-t border-stone-100 dark:border-slate-800">
                <td className="p-3"><div className="font-semibold">{r.name}</div><div className="text-xs text-stone-500">{r.email}</div></td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-40 progress-track"><div className="progress-fill" style={{width:`${r.attendance_percent}%`}}></div></div>
                    <span className={`badge ${r.eligible?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{r.attendance_percent}%</span>
                  </div>
                </td>
                <td className="p-3">{r.eligible ? <span className="badge bg-green-100 text-green-700">✓ Eligible</span> : <span className="text-xs text-stone-500">Needs {90 - Math.floor(r.attendance_percent)}% more</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
