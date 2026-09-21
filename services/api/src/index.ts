import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import { initDb, db } from './db';
import authRoutes from './routes/auth';
import courseRoutes from './routes/courses';
import workshopRoutes from './routes/workshops';
import aiRoutes from './routes/ai';
import questionRoutes from './routes/questions';
import communityRoutes from './routes/community';
import announceRoutes from './routes/announcements';
import adminRoutes, { verifyRouter, myCertsRouter, organizerRouter, syncRouter } from './routes/admin';
import speakingRoutes from './routes/speaking';
import { maybeSeed } from './db/seed';

initDb();
maybeSeed().catch(e => console.error('Seed error:', e));

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  frameguard: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      baseUri: ["'self'"],
      fontSrc: ["'self'", 'https:', 'data:'],
      formAction: ["'self'"],
      frameAncestors: ["'self'", 'https://*.e2b.app', 'https://*.arena.ai', 'https://*.vercel.app', 'http://localhost:*'],
      imgSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'none'"],
      styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
      connectSrc: ["'self'", 'https://openrouter.ai', 'wss:'],
      upgradeInsecureRequests: null,
    },
  },
}));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Static uploads
const uploadDir = config.storageDir;
fs.mkdirSync(uploadDir, { recursive: true });
app.use(config.publicStorageUrl, express.static(uploadDir, { maxAge: '7d' }));

// Health
app.get('/api/health', (_req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/workshops', workshopRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/community', communityRoutes);
app.use('/api', announceRoutes);
app.use('/api', verifyRouter);
app.use('/api', myCertsRouter);
app.use('/api', organizerRouter);
app.use('/api', syncRouter);
app.use('/api/admin', adminRoutes);
app.use('/api/speaking', speakingRoutes);

// Serve static web app if built
const webDist = path.join(config.rootDir, 'apps', 'web', 'dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
    res.sendFile(path.join(webDist, 'index.html'));
  });
}

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'Something went wrong. Please try again.' } });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[aurex] API running on http://0.0.0.0:${config.port}`);
  console.log(`[aurex] DB: ${config.databaseUrl}`);
  console.log(`[aurex] Web: ${config.webUrl}`);
});

export { db };
