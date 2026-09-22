import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { json, route } from '@/lib/api';
import { getUserApiKey } from '@/lib/ai/gateway';

export async function GET() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    const conv = db
      .prepare('SELECT * FROM ai_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 1')
      .get(user.id) as unknown as { id: number; created_at: string } | undefined;
    const messages = conv
      ? (db.prepare('SELECT role, content, model, provider, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT 40').all(conv.id) as unknown as { role: string; content: string; provider: string | null }[])
      : [];
    const byoaiKey = getUserApiKey(db, user.id);
    return json({ messages, byoaiKey: byoaiKey ? byoaiKey.hint : null });
  });
}

export async function DELETE() {
  return route(async () => {
    const user = requireUser();
    const db = getDb();
    const conv = db.prepare('SELECT id FROM ai_conversations WHERE user_id = ? ORDER BY id DESC LIMIT 1').get(user.id) as unknown as { id: number } | undefined;
    if (conv) db.prepare('DELETE FROM ai_messages WHERE conversation_id = ?').run(conv.id);
    return json({ ok: true });
  });
}
