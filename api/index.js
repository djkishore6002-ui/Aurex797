// Vercel serverless entry — sets ephemeral-storage paths, ensures seed DB exists, and mounts the full Express app.
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');

// Load environment from .env if present (local dev only)
try {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
} catch {}

// On Vercel the filesystem is ephemeral — use /tmp for DB/uploads; reset on cold start.
const TMP_DIR = '/tmp/aurex-storage';
try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch (e) {}
const dbPath = path.join(TMP_DIR, 'aurex.db');
process.env.DATABASE_URL = dbPath;
process.env.STORAGE_DIR = path.join(TMP_DIR, 'uploads');
process.env.PUBLIC_STORAGE_URL = '/uploads';
try { fs.mkdirSync(process.env.STORAGE_DIR, { recursive: true }); } catch (e) {}
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = process.env.JWT_SECRET || 'vercel-demo-please-change-32ch-minimum-secret!!';
if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '3000';
process.env.WEB_URL = process.env.WEB_URL || 'https://' + (process.env.VERCEL_URL || 'localhost');
process.env.API_URL = process.env.API_URL || process.env.WEB_URL;
if (!process.env.AI_DEFAULT_PROVIDER) process.env.AI_DEFAULT_PROVIDER = 'mock';

// Seed fresh DB on cold start (only if /tmp was wiped which it is on Vercel cold starts).
let seededPromise = Promise.resolve();
if (!fs.existsSync(dbPath)) {
  seededPromise = (async () => {
    try {
      const distPath = path.join(rootDir, 'services/api/dist');
      // Transpile by ensuring dist exists; if not, skip (Vercel build command builds it)
      if (fs.existsSync(distPath)) {
        const dbMod = require(path.join(distPath, 'db/index'));
        dbMod.initDb();
        const seedMod = require(path.join(distPath, 'db/seed'));
        await seedMod.maybeSeed();
      }
    } catch (e) {
      console.error('Cold-start seed error:', e);
    }
  })();
}

// Mount express app AFTER env+seed.
let appPromise = seededPromise.then(() => {
  const express = require('express');
  const app = express();

  try {
    const helmet = require('helmet');
    app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  } catch {}
  const cors = require('cors');
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  try {
    const morgan = require('morgan');
    app.use(morgan('tiny'));
  } catch {}
  try {
    const rateLimit = require('express-rate-limit');
    app.use(rateLimit({ windowMs: 60_000, max: 300, standardHeaders: true, legacyHeaders: false }));
  } catch {}

  app.use('/uploads', express.static(process.env.STORAGE_DIR, { maxAge: '7d' }));

  const distPath = path.join(rootDir, 'services/api/dist');
  app.use('/api/auth', require(path.join(distPath, 'routes/auth')).default);
  app.use('/api/courses', require(path.join(distPath, 'routes/courses')).default);
  app.use('/api/workshops', require(path.join(distPath, 'routes/workshops')).default);
  app.use('/api/ai', require(path.join(distPath, 'routes/ai')).default);
  app.use('/api/questions', require(path.join(distPath, 'routes/questions')).default);
  app.use('/api/community', require(path.join(distPath, 'routes/community')).default);
  app.use('/api', require(path.join(distPath, 'routes/announcements')).default);
  const admin = require(path.join(distPath, 'routes/admin'));
  app.use('/api', admin.verifyRouter);
  app.use('/api', admin.myCertsRouter);
  app.use('/api', admin.organizerRouter);
  app.use('/api', admin.syncRouter);
  app.use('/api/admin', admin.default);
  app.use('/api/speaking', require(path.join(distPath, 'routes/speaking')).default);

  app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

  const webDist = path.join(rootDir, 'apps/web/dist');
  if (fs.existsSync(webDist)) {
    app.use(express.static(webDist, { maxAge: '1d' }));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => res.sendFile(path.join(webDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
  });

  return app;
});

module.exports = async (req, res) => {
  const app = await appPromise;
  return app(req, res);
};
