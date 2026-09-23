import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DB } from '@/db';

/** In-memory database with the real Solai schema (no demo data). */
export function freshDb(opts?: { foreignKeys?: boolean }): DB {
  const db = new DatabaseSync(':memory:');
  const schema = fs.readFileSync(path.resolve(__dirname, '../../db/schema.sql'), 'utf8');
  db.exec(schema);
  if (opts?.foreignKeys === false) {
    db.exec('PRAGMA foreign_keys = OFF;'); // isolated rows (schema.sql re-enables it)
  }
  return db;
}
