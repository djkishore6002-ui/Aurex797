/**
 * Manual (re)seed helper:  npm run db:seed
 * Deletes existing data and re-runs the development seed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { seedDatabase } from './seed';

const DB_PATH = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/solai.db');
const db = new DatabaseSync(DB_PATH);

// Wipe all tables (FK-safe order)
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
  .all() as unknown as { name: string }[];
db.exec('PRAGMA foreign_keys = OFF;');
for (const t of tables) db.exec(`DELETE FROM "${t.name}";`);
db.exec('PRAGMA foreign_keys = ON;');

const schema = fs.readFileSync(path.resolve(process.cwd(), 'src/db/schema.sql'), 'utf8');
db.exec(schema);
seedDatabase(db);
console.log('[seed-cli] re-seeded complete at', DB_PATH);
db.close();
