import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function OrganizerCourses() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('/courses?per_page=100').then((d: any) => setItems(user?.role==='admin'?d.items:d.items.filter((c:any)=>c.instructor_id===user?.id || true))); }, [user]);
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold">Courses</h1>
        <Link to="/organizer/courses/new" className="btn-primary">+ New course</Link>
      </div>
      <div className="mt-5 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c: any) => (
          <div key={c.id} className="card p-5">
            <div className="font-tamil text-sm text-brand-700">{c.title_ta}</div>
            <div className="font-bold text-lg">{c.title}</div>
            <div className="text-xs text-stone-500 mt-1 capitalize">{c.level.replace('_',' ')} · {c.enrollment_count} learners</div>
            <p className="text-sm text-stone-500 mt-2 line-clamp-2">{c.description}</p>
            <div className="mt-3 flex gap-2">
              <Link to={`/courses/${c.id}`} className="btn-secondary text-sm">View</Link>
              <span className={`badge ${c.published?'bg-green-100 text-green-700':'bg-stone-100 text-stone-600'}`}>{c.published?'Published':'Draft'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
