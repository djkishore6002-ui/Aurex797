import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getDb, type Role } from '@/db';
import { ApiError } from '@/lib/api';

export const SESSION_COOKIE = 'solai_session';
const SESSION_DAYS = 30;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: Role;
  avatar_url: string | null;
  native_language: string | null;
  tamil_level: string | null;
  learning_goal: string | null;
  is_active: number;
}

/* ── Password hashing (scrypt, from Node stdlib — no native deps) ── */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, salt, hash] = stored.split(':');
    if (scheme !== 'scrypt' || !salt || !hash) return false;
    const candidate = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

/* ── Sessions ── */
export function createSession(userId: number, ip?: string, userAgent?: string): string {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at, ip, user_agent) VALUES (?,?,?,?,?)').run(token, userId, expires, ip ?? null, userAgent ?? null);
  db.prepare('UPDATE users SET last_login_at = datetime(\'now\') WHERE id = ?').run(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 86400,
  });
  return token;
}

export function destroySession(): void {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  cookies().set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Read the current logged-in user (server components + route handlers). Returns null when anonymous. */
export function getCurrentUser(): SessionUser | null {
  // Static snapshot (GitHub Pages) build: no request cookies, always anonymous.
  if (process.env.SOLAI_STATIC === '1') return null;
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const row = db
    .prepare(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.native_language, u.tamil_level, u.learning_goal, u.is_active, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token = ?`
    )
    .get(token) as unknown as (SessionUser & { expires_at: string }) | undefined;
  if (!row) return null;
  const expires = new Date(row.expires_at.includes('T') ? row.expires_at : row.expires_at.replace(' ', 'T') + 'Z');
  if (expires.getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  if (!row.is_active) return null;
  const { expires_at: _drop, ...user } = row;
  return user;
}

/* ── RBAC — every sensitive operation must pass through these ── */
export function requireUser(): SessionUser {
  const user = getCurrentUser();
  if (!user) throw new ApiError(401, 'You must be signed in');
  return user;
}

export function requireRole(...roles: Role[]): SessionUser {
  const user = requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, 'You do not have permission to perform this action');
  return user;
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === 'super_admin';
}

export function isStaff(user: SessionUser): boolean {
  return user.role === 'super_admin' || user.role === 'organizer' || user.role === 'teacher';
}

export function canManageCourse(user: SessionUser, course: { instructor_id: number | null; organizer_id: number | null }): boolean {
  if (user.role === 'super_admin') return true;
  if (user.role === 'organizer') return course.organizer_id === user.id || course.instructor_id === user.id;
  if (user.role === 'teacher') return course.instructor_id === user.id;
  return false;
}

export function clearExpiredSessions(): void {
  getDb().prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();
}
