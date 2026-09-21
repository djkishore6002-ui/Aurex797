import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function Workshops() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api('/workshops').then((d: any) => setItems(d.items)).finally(()=>setLoading(false)); }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Live Workshops</h1>
      <p className="text-stone-500 mt-1">Join live classes, earn certificates with 90%+ attendance.</p>

      {loading ? <div className="mt-6 text-stone-500">Loading…</div> : (
        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((w: any) => {
            const firstSession = w.id; // sessions fetched in detail
            return (
              <Link to={`/workshops/${w.id}`} key={w.id} className="card overflow-hidden hover:shadow-lg transition group">
                <div className="h-32 bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-6xl">🎓</div>
                <div className="p-5">
                  <div className="font-bold text-lg">{w.title}</div>
                  <p className="text-sm text-stone-500 mt-1 line-clamp-2">{w.description}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="badge bg-green-100 text-green-700">Free</span>
                    <span className="text-stone-500">{w.registered}/{w.capacity} seats</span>
                  </div>
                  <div className="mt-2 text-xs text-stone-500">by {w.instructor_name}</div>
                </div>
              </Link>
            );
          })}
          {items.length === 0 && <div className="col-span-full text-center text-stone-500 p-8">No workshops yet.</div>}
        </div>
      )}
    </div>
  );
}
