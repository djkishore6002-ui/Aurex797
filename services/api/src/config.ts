import path from 'path';
import fs from 'fs';

const rootDir = path.resolve(__dirname, '..', '..', '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadEnv();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me-in-production-please-32ch',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  databaseUrl: process.env.DATABASE_URL || path.join(rootDir, 'storage', 'aurex.db'),
  storageDir: process.env.STORAGE_DIR || path.join(rootDir, 'storage', 'uploads'),
  publicStorageUrl: process.env.PUBLIC_STORAGE_URL || '/uploads',
  openRouterKey: process.env.OPENROUTER_API_KEY || '',
  aiDefaultProvider: (process.env.AI_DEFAULT_PROVIDER as 'mock' | 'openrouter') || 'mock',
  aiPlatformModel: process.env.AI_PLATFORM_MODEL || 'openrouter/auto',
  aiDailyLimit: parseInt(process.env.AI_DAILY_LIMIT_PER_USER || '50', 10),
  webUrl: process.env.WEB_URL || 'http://localhost:5173',
  apiUrl: process.env.API_URL || 'http://localhost:4000',
  rootDir,
};

fs.mkdirSync(path.dirname(config.databaseUrl.replace('file:', '')), { recursive: true });
fs.mkdirSync(config.storageDir, { recursive: true });
