import { useEffect, useState } from 'react';
import api from '@/lib/api';

export default function OrganizerQuestions() {
  const [items, setItems] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('pending');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<any>(null);
  const load = async () => {
    const [d, s] = await Promise.all([api<any>(`/questions?status=${filter==='all'?'':filter}`), api('/questions/stats/overview')]);
    setItems(d.items); setStats(s);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const respond = async (id: string, action: 'answer'|'edit_ai'|'reject'|'resolve' = 'answer') => {
    const text = answers[id]; if (!text) return alert('Enter a response');
    await api(`/questions/${id}/respond`, { method: 'POST', json: { answer: text, action } });
    setAnswers({...answers, [id]:''}); load();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Questions</h1>
      {stats && (
        <div className="grid grid-cols-4 gap-3 mt-4">
          <StatBox label="Total" value={stats.total}/>
          <StatBox label="AI answered" value={stats.ai_answered} color="bg-blue-50 text-blue-700"/>
          <StatBox label="Teacher" value={stats.teacher_answered} color="bg-green-50 text-green-700"/>
          <StatBox label="Pending" value={stats.pending} color="bg-amber-50 text-amber-700"/>
        </div>
      )}
      <div className="mt-5 flex gap-2 flex-wrap">
        {['pending','ai_answered','teacher_reviewed','resolved','all'].map(f => (
          <button key={f} onClick={()=>setFilter(f)} className={`px-3 py-1.5 rounded-full text-sm font-semibold capitalize ${filter===f?'bg-brand-500 text-white':'bg-white dark:bg-slate-900 border border-stone-200 dark:border-slate-800'}`}>{f.replace('_',' ')}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {items.map((q: any) => (
          <div key={q.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="text-xs text-stone-500">{q.asker_name} · {new Date(q.created_at).toLocaleString()} · <span className="capitalize">{q.status.replace('_',' ')}</span></div>
                <div className="font-semibold mt-1">{q.body}</div>
                {q.ai_answer && <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm"><b className="text-blue-700 dark:text-blue-300">AI:</b> {q.ai_answer}</div>}
                {q.teacher_answer && <div className="mt-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm"><b className="text-green-700 dark:text-green-300">Teacher:</b> {q.teacher_answer}</div>}
              </div>
            </div>
            {q.status !== 'resolved' && (
              <div className="mt-3 flex gap-2">
                <textarea className="input flex-1 h-16 resize-none" placeholder="Write your response..." value={answers[q.id]||''} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/>
                <div className="flex flex-col gap-1">
                  <button onClick={()=>respond(q.id,'answer')} className="btn-primary text-xs px-3 py-1.5">Reply</button>
                  <button onClick={()=>respond(q.id,'resolve')} className="btn-secondary text-xs px-3 py-1.5">Resolve</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {items.length===0 && <div className="text-stone-500 text-center p-8">No questions in this filter.</div>}
      </div>
    </div>
  );
}

function StatBox({label,value,color='bg-stone-50 dark:bg-slate-900 text-stone-700 dark:text-stone-300'}:any){return <div className={`card p-4 ${color}`}><div className="text-xs opacity-70">{label}</div><div className="text-2xl font-extrabold">{value}</div></div>;}
