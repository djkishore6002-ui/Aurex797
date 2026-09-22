import { getDb } from '@/db';
import type { SessionUser } from '@/lib/auth';

/**
 * Append an audit-log entry for privileged actions.
 * prev/new values are JSON snapshots (never secrets — callers must strip them).
 */
export function audit(
  actor: SessionUser | null,
  action: string,
  opts: { entity?: string; entity_id?: number; prev?: unknown; next?: unknown; ip?: string; userAgent?: string } = {}
): void {
  try {
    getDb()
      .prepare(
        `INSERT INTO audit_logs (actor_id, actor_email, action, entity, entity_id, prev_value, new_value, ip, user_agent)
         VALUES (?,?,?,?,?,?,?,?,?)`
      )
      .run(
        actor?.id ?? null,
        actor?.email ?? 'system',
        action,
        opts.entity ?? null,
        opts.entity_id ?? null,
        opts.prev === undefined ? null : JSON.stringify(opts.prev),
        opts.next === undefined ? null : JSON.stringify(opts.next),
        opts.ip ?? null,
        opts.userAgent ?? null
      );
  } catch (e) {
    console.error('[audit] failed', e);
  }
}

/** Record a content version snapshot (CMS versioning). */
export function saveVersion(entity: string, entityId: number, data: unknown, createdBy?: number): void {
  const db = getDb();
  const prev = db.prepare('SELECT MAX(version) AS v FROM content_versions WHERE entity = ? AND entity_id = ?').get(entity, entityId) as unknown as { v: number | null };
  db.prepare('INSERT INTO content_versions (entity, entity_id, version, data, created_by) VALUES (?,?,?,?,?)').run(
    entity,
    entityId,
    (prev.v ?? 0) + 1,
    JSON.stringify(data),
    createdBy ?? null
  );
}
