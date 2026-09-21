import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';

const SAMPLE_VIDEO = 'https://www.w3schools.com/html/mov_bbb.mp4';

export default function CourseBuilder() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: '', title_ta: '', description: '', level: 'beginner',
    explanation_language: 'en', category: 'Foundations',
  });
  const [modules, setModules] = useState<any[]>([{ title: 'Module 1', lessons: [{ title: '', type: 'video', duration_seconds: 300, video_url: SAMPLE_VIDEO, vocab: [] }] }]);
  const [busy, setBusy] = useState(false);

  const publish = async () => {
    if (!form.title || !form.description) return alert('Title and description required');
    setBusy(true);
    try {
      const c = await api<{ id: string }>('/courses', { method: 'POST', json: form });
      for (const m of modules) {
        const mod = await api<{ id: string }>(`/courses/${c.id}/modules`, { method: 'POST', json: { title: m.title } });
        for (const l of m.lessons) {
          if (!l.title) continue;
          const created = await api<{ id: string }>(`/courses/${c.id}/lessons`, { method: 'POST', json: { ...l, module_id: mod.id, duration_seconds: parseInt(l.duration_seconds)||300, video_url: l.video_url || SAMPLE_VIDEO } });
          for (const v of (l.vocab || [])) {
            if (v.tamil && v.meaning) await api(`/courses/lessons/${created.id}/vocab`, { method: 'POST', json: v });
          }
        }
      }
      await api(`/courses/${c.id}/publish`, { method: 'POST' });
      nav(`/courses/${c.id}`);
    } catch (e: any) { alert(e.message); }
    setBusy(false);
  };

  const addModule = () => setModules(m => [...m, { title: `Module ${m.length+1}`, lessons: [] }]);
  const addLesson = (mi: number) => {
    const copy = [...modules];
    copy[mi].lessons.push({ title: '', type: 'video', duration_seconds: 300, video_url: SAMPLE_VIDEO, vocab: [] });
    setModules(copy);
  };
  const updLesson = (mi: number, li: number, patch: any) => {
    const copy = [...modules]; copy[mi].lessons[li] = { ...copy[mi].lessons[li], ...patch }; setModules(copy);
  };
  const addVocab = (mi: number, li: number) => {
    const copy = [...modules]; copy[mi].lessons[li].vocab.push({ tamil: '', transliteration: '', meaning: '', difficulty: 'beginner' }); setModules(copy);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Create Course</h1>

      <div className="card p-6 mt-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><label className="label">Title (English)</label><input className="input" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="e.g. Tamil for Travelers"/></div>
          <div><label className="label">Title (Tamil)</label><input className="input font-tamil" value={form.title_ta} onChange={e=>setForm({...form,title_ta:e.target.value})} placeholder="பயணிகளுக்கான தமிழ்"/></div>
        </div>
        <div><label className="label">Description</label><textarea className="input h-24 resize-none" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></div>
        <div className="grid md:grid-cols-3 gap-3">
          <div><label className="label">Level</label>
            <select className="input" value={form.level} onChange={e=>setForm({...form,level:e.target.value})}>
              {['absolute_beginner','beginner','intermediate','advanced'].map(l => <option key={l} value={l}>{l.replace('_',' ')}</option>)}
            </select>
          </div>
          <div><label className="label">Category</label><input className="input" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></div>
          <div><label className="label">Explanation language</label>
            <select className="input" value={form.explanation_language} onChange={e=>setForm({...form,explanation_language:e.target.value})}>
              <option value="en">English</option><option value="hi">Hindi</option><option value="te">Telugu</option><option value="ml">Malayalam</option><option value="kn">Kannada</option>
            </select>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold mt-6 mb-3">Curriculum</h2>
      {modules.map((m, mi) => (
        <div key={mi} className="card p-5 mb-3">
          <input className="input font-bold text-lg mb-3" value={m.title} onChange={e => { const c=[...modules]; c[mi].title=e.target.value; setModules(c); }} />
          <div className="space-y-3">
            {m.lessons.map((l: any, li: number) => (
              <div key={li} className="p-3 rounded-xl border border-stone-200 dark:border-slate-800 space-y-2">
                <div className="grid md:grid-cols-3 gap-2">
                  <input className="input md:col-span-2" placeholder="Lesson title" value={l.title} onChange={e=>updLesson(mi,li,{title:e.target.value})}/>
                  <select className="input" value={l.type} onChange={e=>updLesson(mi,li,{type:e.target.value})}>
                    <option value="video">Video</option><option value="vocabulary">Vocabulary</option><option value="grammar">Grammar</option><option value="scenario">Scenario</option><option value="reading">Reading</option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-2">
                  <input className="input" placeholder="Video URL (mp4)" value={l.video_url} onChange={e=>updLesson(mi,li,{video_url:e.target.value})}/>
                  <input className="input" type="number" placeholder="Duration seconds" value={l.duration_seconds} onChange={e=>updLesson(mi,li,{duration_seconds:e.target.value})}/>
                </div>
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-brand-600">Vocabulary ({l.vocab.length})</summary>
                  <div className="space-y-2 mt-2">
                    {l.vocab.map((v: any, vi: number) => (
                      <div key={vi} className="grid grid-cols-3 gap-2">
                        <input className="input font-tamil" placeholder="தமிழ்" value={v.tamil} onChange={e=>{const c=[...modules]; c[mi].lessons[li].vocab[vi].tamil=e.target.value; setModules(c);}}/>
                        <input className="input" placeholder="Transliteration" value={v.transliteration} onChange={e=>{const c=[...modules]; c[mi].lessons[li].vocab[vi].transliteration=e.target.value; setModules(c);}}/>
                        <input className="input" placeholder="Meaning" value={v.meaning} onChange={e=>{const c=[...modules]; c[mi].lessons[li].vocab[vi].meaning=e.target.value; setModules(c);}}/>
                      </div>
                    ))}
                    <button className="text-sm text-brand-600 font-semibold" onClick={()=>addVocab(mi,li)}>+ Add word</button>
                  </div>
                </details>
              </div>
            ))}
            <button className="btn-secondary text-sm" onClick={()=>addLesson(mi)}>+ Add lesson</button>
          </div>
        </div>
      ))}
      <button className="btn-secondary" onClick={addModule}>+ Add module</button>

      <div className="mt-6 flex gap-3">
        <button onClick={publish} disabled={busy} className="btn-primary text-lg px-6">{busy?'Publishing…':'Publish course'}</button>
      </div>
    </div>
  );
}
