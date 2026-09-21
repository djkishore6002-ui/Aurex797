import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function Community() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { api('/community').then((d: any) => setItems(d.items)); }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Community</h1>
      <p className="text-stone-500 mt-1">Join groups, ask questions, and practice together.</p>
      <div className="mt-6 grid md:grid-cols-2 gap-4">
        {items.map((c: any) => (
          <Link to={`/community/${c.id}`} key={c.id} className="card p-5 hover:shadow-md transition">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-2xl">💬</div>
              <div className="flex-1">
                <div className="font-bold">{c.name}</div>
                <div className="text-sm text-stone-500">{c.description}</div>
                <div className="text-xs text-stone-500 mt-2">{c.members} members · created by {c.creator_name}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
