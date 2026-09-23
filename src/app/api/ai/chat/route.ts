import { z } from 'zod';
import { getDb } from '@/db';
import { requireUser } from '@/lib/auth';
import { aiChat, getOrCreateConversation, saveMessages, getUserApiKey } from '@/lib/ai/gateway';
import { ApiError, json, rateLimit, clientIp, readJson, route } from '@/lib/api';
import type { TutorContext } from '@/components/AiTutor';

const schema = z.object({
  question: z.string().trim().min(1, 'Ask a question first').max(2000),
  context: z
    .object({
      type: z.enum(['lesson', 'workshop', 'vocabulary', 'page', 'scenario', 'general']),
      id: z.number().int().optional(),
      label: z.string().max(300),
      text: z.string().max(4000).optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(req: Request) {
  return route(async () => {
    const user = requireUser();
    const body = schema.parse(await readJson(req));
    const ip = clientIp(req);
    const rl = rateLimit(`ai:${user.id}`, 30, 60_000);
    if (!rl.ok) throw new ApiError(429, 'You are sending AI requests too quickly. Slow down a little.');

    const db = getDb();

    // If a lesson/workshop context id is given, verify it exists and is published
    let context = body.context;
    if (context?.id) {
      if (context.type === 'lesson') {
        const l = db.prepare('SELECT id FROM lessons WHERE id = ? AND is_published = 1').get(context.id);
        if (!l) context = { ...context, id: undefined };
      } else if (context.type === 'workshop') {
        const w = db.prepare('SELECT id FROM workshops WHERE id = ? AND is_published = 1 AND deleted_at IS NULL').get(context.id);
        if (!w) context = { ...context, id: undefined };
      }
    }

    // Load the user's native language for multilingual explanations
    const row = db.prepare('SELECT native_language FROM users WHERE id = ?').get(user.id) as unknown as { native_language: string | null };

    const convId = getOrCreateConversation(db, user.id, context?.type ?? 'general', context?.id ?? null, context?.label ?? 'Conversation');

    const history = (
      db
        .prepare("SELECT role, content FROM ai_messages WHERE conversation_id = ? AND role IN ('user','assistant') ORDER BY id DESC LIMIT 8")
        .all(convId) as unknown as { role: string; content: string }[]
    )
      .reverse()
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const resp = await aiChat(user, { question: body.question, history, context: context as TutorContext | undefined, language: row.native_language ?? undefined }, db);
    saveMessages(db, convId, body.question, resp);
    return json({ answer: resp.answer, provider: resp.provider, model: resp.model, usedKnowledge: resp.usedKnowledge, citations: resp.citations, cached: resp.cached });
  });
}
