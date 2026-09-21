import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { useOffline } from '@/lib/offline';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { dark, toggle } = useTheme();
  const { online, queued } = useOffline();
  const nav = useNavigate();

  const links = user?.role === 'admin'
    ? [
        { to: '/', label: 'Dashboard', icon: '🏠' },
        { to: '/admin/users', label: 'Users', icon: '👥' },
        { to: '/admin/courses', label: 'Courses', icon: '📚' },
        { to: '/admin/workshops', label: 'Workshops', icon: '🎓' },
        { to: '/admin/certificates', label: 'Certificates', icon: '🏅' },
      ]
    : user?.role === 'organizer'
    ? [
        { to: '/organizer', label: 'Dashboard', icon: '🏠' },
        { to: '/organizer/courses', label: 'Courses', icon: '📚' },
        { to: '/organizer/workshops', label: 'Workshops', icon: '🎓' },
        { to: '/organizer/questions', label: 'Questions', icon: '❓' },
        { to: '/organizer/announcements', label: 'Announcements', icon: '📣' },
      ]
    : [
        { to: '/', label: 'Home', icon: '🏠' },
        { to: '/courses', label: 'Learn', icon: '📚' },
        { to: '/workshops', label: 'Workshops', icon: '🎓' },
        { to: '/ai', label: 'AI Tutor', icon: '🤖' },
        { to: '/community', label: 'Community', icon: '💬' },
        { to: '/profile', label: 'Profile', icon: '👤' },
      ];

  return (
    <div className="min-h-full flex flex-col lg:flex-row">
      {/* Sidebar (desktop) / Bottom nav (mobile) */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-stone-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 backdrop-blur p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold text-lg shadow-glow">த</div>
          <div>
            <div className="font-bold text-lg leading-none">Aurex</div>
            <div className="text-xs text-stone-500 dark:text-stone-400">Learn Tamil. Live it.</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${isActive ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-slate-800'}`
              }>
              <span className="text-lg">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          <button onClick={toggle} className="w-full btn-secondary justify-start">{dark ? '☀️ Light' : '🌙 Dark'}</button>
          {user && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 dark:bg-slate-900">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-tamil-500 flex items-center justify-center text-white font-semibold text-sm">{user.name[0]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{user.name}</div>
                <div className="text-xs text-stone-500 capitalize">{user.role}</div>
              </div>
              <button onClick={() => { logout(); nav('/login'); }} className="text-xs text-stone-500 hover:text-red-500">Logout</button>
            </div>
          )}
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-stone-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-tamil-600 flex items-center justify-center text-white font-tamil font-bold">த</div>
        <div className="font-bold">Aurex</div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-amber-500'}`}></span>
          {queued > 0 && <span className="badge bg-amber-100 text-amber-800">{queued} pending</span>}
          <button onClick={toggle} className="p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-slate-800">{dark ? '☀️' : '🌙'}</button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-0">{children}</main>

      {/* Bottom nav (mobile) */}
      {user && user.role === 'learner' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-stone-200 dark:border-slate-800 px-2 py-1.5 flex gap-1">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg text-[11px] font-medium ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-stone-500 dark:text-stone-400'}`
              }>
              <span className="text-xl">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
      {user && user.role !== 'learner' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/90 dark:bg-slate-950/90 backdrop-blur border-t border-stone-200 dark:border-slate-800 px-2 py-1.5 flex gap-1 overflow-x-auto">
          {links.map(l => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap ${isActive ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'text-stone-500 dark:text-stone-400'}`
              }>
              <span className="text-lg">{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
