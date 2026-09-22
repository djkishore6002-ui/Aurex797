/**
 * Full reset:  npm run db:reset  (removes the database file — app re-seeds on next start)
 */
import fs from 'node:fs';
import path from 'node:path';

const DB_PATH = path.resolve(process.cwd(), process.env.DATABASE_PATH || './data/solai.db');
for (const suffix of ['', '-wal', '-shm']) {
  const p = DB_PATH + suffix;
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log('[reset] removed', p);
  }
}
console.log('[reset] done. Start the dev server — it will re-seed automatically.');
