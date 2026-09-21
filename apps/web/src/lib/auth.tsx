import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import api from './api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer' | 'learner';
  avatar_url?: string | null;
}
export interface Profile {
  native_language?: string | null;
  learning_goal?: string | null;
  level: string;
  xp: number;
  streak_days: number;
  daily_goal_minutes: number;
  bio?: string | null;
}

interface AuthCtx {
  user: AuthUser | null;
  profile: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: 'learner'|'organizer') => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('aurex_token');
    if (!token) { setUser(null); setProfile(null); setLoading(false); return; }
    try {
      const data = await api<{ user: AuthUser; profile: Profile }>('/auth/me');
      setUser(data.user);
      setProfile(data.profile);
    } catch {
      localStorage.removeItem('aurex_token');
      setUser(null); setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (email: string, password: string) => {
    const data = await api<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', json: { email, password } });
    localStorage.setItem('aurex_token', data.token);
    setUser(data.user);
    await refresh();
  };
  const register = async (name: string, email: string, password: string, role: 'learner'|'organizer' = 'learner') => {
    const data = await api<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', json: { name, email, password, role } });
    localStorage.setItem('aurex_token', data.token);
    setUser(data.user);
    await refresh();
  };
  const logout = () => {
    localStorage.removeItem('aurex_token');
    setUser(null); setProfile(null);
    api('/auth/logout', { method: 'POST' }).catch(() => {});
  };

  return <Ctx.Provider value={{ user, profile, loading, login, register, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
