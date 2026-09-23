import { tx, type DB } from '@/db';

export function notify(db: DB, userId: number, category: 'learning' | 'workshop' | 'teacher' | 'certificate' | 'community' | 'system', title: string, body: string, linkUrl?: string | null): void {
  db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)').run(userId, category, title, body, linkUrl ?? null);
}

export function notifyMany(db: DB, userIds: number[], category: 'learning' | 'workshop' | 'teacher' | 'certificate' | 'community' | 'system', title: string, body: string, linkUrl?: string | null): void {
  const stmt = db.prepare('INSERT INTO notifications (user_id, category, title, body, link_url) VALUES (?,?,?,?,?)');
  tx(db, () => {
    for (const id of userIds) stmt.run(id, category, title, body, linkUrl ?? null);
  });
}
