import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, rateLimit, readJson, route, clientIp } from '@/lib/api';
import { getUserApiKey, setUserApiKey, deleteUserApiKey, getProviderSettings } from '@/lib/ai/gateway';
import { z } from 'zod';

/**
 * BYOAI (Bring Your Own OpenRouter Key)
 * - GET:    returns only a hint (sk-…last4), never the key
 * - POST:   store an encrypted key
 * - DELETE: remove it
 * The key is AES-256-GCM encrypted, used only server-side, and never logged.
 */
export async function GET() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    const settings = getProviderSettings(db);
    const stored = getUserApiKey(db, user.id);
    return json({ enabled: settings.byoai_enabled === 1, stored: stored ? stored.hint : null });
  });
}

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const rl = rateLimit(`byoai:${clientIp(req)}`, 5, 60_000);
    if (!rl.ok) throw new Error('Too many attempts');
    const body = (await readJson(req)) as unknown as { key: string };
    const key = z.string().min(16, 'That does not look like an OpenRouter API key').max(200).parse(body.key);
    const db = getDb();
    const settings = getProviderSettings(db);
    if (settings.byoai_enabled !== 1) throw new Error('BYOAI is disabled by the platform admin.');
    setUserApiKey(db, user.id, key.trim());
    const stored = getUserApiKey(db, user.id);
    return json({ ok: true, hint: stored?.hint });
  });
}

export async function DELETE() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    deleteUserApiKey(db, user.id);
    return json({ ok: true });
  });
}
