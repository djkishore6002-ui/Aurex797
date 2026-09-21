import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/lib/api';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  useEffect(() => { api('/admin/stats').then(setStats); }, []);
  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 animate-fade-in">
      <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
      <p className="text-stone-500 mt-1">Platform-wide management and analytics.</p>

      <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat icon="👥" label="Learners" value={stats?.users ?? 0}/>
        <Stat icon="🧑‍🏫" label="Organizers" value={stats?.organizers ?? 0}/>
        <Stat icon="📚" label="Courses" value={stats?.courses ?? 0}/>
        <Stat icon="🎓" label="Workshops" value={stats?.workshops ?? 0}/>
        <Stat icon="✅" label="Enrollments" value={stats?.enrollments ?? 0}/>
        <Stat icon="🏅" label="Certificates" value={stats?.certificates ?? 0}/>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Link to="/admin/users" className="card p-6 hover:shadow-md transition">
          <div className="text-3xl">👥</div><div className="font-bold mt-2 text-lg">Manage Users & Organizers</div>
          <p className="text-sm text-stone-500 mt-1">Create organizers, suspend accounts, view activity.</p>
        </Link>
        <Link to="/admin/certificates" className="card p-6 hover:shadow-md transition">
          <div className="text-3xl">🏅</div><div className="font-bold mt-2 text-lg">Certificates</div>
          <p className="text-sm text-stone-500 mt-1">View and verify issued certificates.</p>
        </Link>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="card p-5">
      <div className="text-2xl">{icon}</div>
      <div className="text-xs text-stone-500 mt-1">{label}</div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}
