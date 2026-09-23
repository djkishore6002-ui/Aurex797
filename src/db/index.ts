import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed';

const DB_PATH = process.env.DATABASE_PATH || './data/solai.db';

export type DB = DatabaseSync;

let _db: DB | null = null;
let _bootstrapped = false;

/**
 * Open (and lazily bootstrap) the SQLite database.
 * - applies schema.sql (idempotent, CREATE TABLE IF NOT EXISTS)
 * - seeds demo/dev data on first boot when the database is empty
 */
export function getDb(): DB {
  if (!_db) {
    const abs = path.resolve(process.cwd(), DB_PATH);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    _db = new DatabaseSync(abs);
    _db.exec('PRAGMA journal_mode = WAL;');
    _db.exec('PRAGMA foreign_keys = ON;');
    _db.exec('PRAGMA busy_timeout = 8000;');
  }
  if (!_bootstrapped) {
    const schemaPath = path.resolve(process.cwd(), 'src/db/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    _db.exec(schema);
    // Lightweight forward migrations (schema.sql is CREATE-IF-NOT-EXISTS only)
    try {
      _db.exec("ALTER TABLE users ADD COLUMN display_language TEXT DEFAULT 'ta'");
    } catch {
      /* column already exists */
    }
    // Migration: extend ai_knowledge_documents.source_type CHECK with
    // 'resource' | 'culture' | 'district' (fresh DBs already have it).
    const docSql = String(
      (_db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='ai_knowledge_documents'").get() as unknown as { sql: string } | undefined)?.sql ?? ''
    );
    if (docSql && !docSql.includes("'resource'")) {
      _db.exec('PRAGMA foreign_keys = OFF;');
      _db.exec(
        `CREATE TABLE ai_knowledge_documents_migrate (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           source_type TEXT NOT NULL CHECK (source_type IN ('course','lesson','faq','page','workshop','announcement','vocabulary','scenario','help','resource','culture','district')),
           source_id INTEGER NOT NULL,
           title TEXT NOT NULL,
           content_text TEXT NOT NULL,
           status TEXT NOT NULL DEFAULT 'current' CHECK (status IN ('current','stale')),
           indexed_at TEXT,
           updated_at TEXT NOT NULL DEFAULT (datetime('now')),
           UNIQUE (source_type, source_id)
         );
         INSERT INTO ai_knowledge_documents_migrate (id, source_type, source_id, title, content_text, status, indexed_at, updated_at)
           SELECT id, source_type, source_id, title, content_text, status, indexed_at, updated_at FROM ai_knowledge_documents;
         DROP TABLE ai_knowledge_documents;
         ALTER TABLE ai_knowledge_documents_migrate RENAME TO ai_knowledge_documents;`
      );
      _db.exec('PRAGMA foreign_keys = ON;');
    }
    const marker = _db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='seed_meta'").get();
    if (!marker) {
      // First boot (or a previously interrupted seed): (re)seed the demo data.
      const count = _db.prepare('SELECT COUNT(*) AS c FROM users').get() as unknown as { c: number };
      if (count.c > 0) {
        console.warn('[db] incomplete seed detected — resetting and re-seeding development data');
        const tables = _db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as unknown as { name: string }[];
        _db.exec('PRAGMA foreign_keys = OFF;');
        for (const t of tables) _db.exec(`DELETE FROM "${t.name}";`);
        _db.exec('PRAGMA foreign_keys = ON;');
      }
      seedDatabase(_db);
    }
    _bootstrapped = true;
  }
  return _db;
}

/**
 * node:sqlite returns rows with null prototypes, which Next.js cannot
 * serialize into Client Components. Convert them to plain objects.
 */
export function plainRows<T = Record<string, unknown>>(rows: unknown): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => (r ? { ...r } : r)) as T[];
}

/** Manual transaction helper (node:sqlite has no .transaction()). */
export function tx<T>(db: DB, fn: () => T): T {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export const UPLOAD_DIR = path.resolve(process.cwd(), './data/uploads');
export function ensureUploadDir(): string {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
}

export type Role = 'super_admin' | 'organizer' | 'teacher' | 'learner';
