import type { DB } from '@/db';
import { getDb } from '@/db';

/* Gamification — XP, streaks, vocabulary counts. Feature-flagged
   through site_settings so the Super Admin can enable/disable it. */

export function gamificationEnabled(db: DB = getDb()): boolean {
  const row = db.prepare("SELECT value FROM site_settings WHERE key = 'gamification'").get() as unknown as { value: string } | undefined;
  if (!row) return true;
  try {
    return JSON.parse(row.value)?.enabled !== false;
  } catch {
    return true;
  }
}

export function awardXp(db: DB, userId: number, kind: string, amount: number, refType?: string, refId?: number): void {
  if (!gamificationEnabled(db) || amount <= 0) return;
  db.prepare('INSERT INTO xp_events (user_id, kind, amount, ref_type, ref_id) VALUES (?,?,?,?,?)').run(userId, kind, amount, refType ?? null, refId ?? null);
}

export function totalXp(db: DB, userId: number): number {
  const row = db.prepare('SELECT SUM(amount) AS x FROM xp_events WHERE user_id = ?').get(userId) as unknown as { x: number | null };
  return row.x ?? 0;
}

export function computeStreak(db: DB, userId: number): number {
  const rows = db.prepare("SELECT DISTINCT date(created_at) AS d FROM xp_events WHERE user_id = ? ORDER BY d DESC LIMIT 400").all(userId) as unknown as { d: string }[];
  if (!rows.length) return 0;
  const days = new Set(rows.map((r) => r.d));
  // Streak counts back from today (or yesterday, so late-night learners keep it)
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today.getTime() - 86400_000).toISOString().slice(0, 10);
  let cursor = days.has(todayStr) ? new Date(today) : days.has(yesterday) ? new Date(today.getTime() - 86400_000) : null;
  if (!cursor) return 0;
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor = new Date(cursor.getTime() - 86400_000);
  }
  return streak;
}

export function vocabLearnedCount(db: DB, userId: number): number {
  const row = db.prepare("SELECT COUNT(*) AS c FROM vocabulary_progress WHERE user_id = ? AND status = 'known'").get(userId) as unknown as { c: number };
  return row.c;
}

export function todayXp(db: DB, userId: number): number {
  const row = db.prepare("SELECT SUM(amount) AS x FROM xp_events WHERE user_id = ? AND date(created_at) = date('now')").get(userId) as unknown as { x: number | null };
  return row.x ?? 0;
}
