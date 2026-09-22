import { ApiError } from '@/lib/api';
import { estimateTokens, type AIProvider, type AIRequest, type AIResponse, type AIProviderOptions, type RetrievedChunk } from './provider';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * OpenRouter chat-completions provider. The API key is only ever used
 * server-side — it is never sent to the browser.
 */
export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter';
  constructor(private apiKey: string) {}

  async complete(req: AIRequest, opts: AIProviderOptions): Promise<AIResponse> {
    const system = buildSystemPrompt(req, opts);
    const messages: { role: string; content: string }[] = [{ role: 'system', content: system }];
    for (const turn of req.history.slice(-8)) messages.push({ role: turn.role, content: turn.content });
    messages.push({ role: 'user', content: req.question });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    let resp: Response;
    try {
      resp = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          'X-Title': 'Solai Tamil Learning',
        },
        body: JSON.stringify({
          model: opts.model,
          messages,
          temperature: opts.temperature,
          max_tokens: opts.maxTokens,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      throw new ApiError(502, 'The AI provider could not be reached. Please try again.');
    }
    clearTimeout(timeout);
    if (!resp.ok) {
      const body = await resp.text().catch(() => '');
      console.error('[openrouter]', resp.status, body.slice(0, 300));
      throw new ApiError(502, `AI provider error (${resp.status}). The tutor fell back to local knowledge.`);
    }
    const data = (await resp.json()) as unknown as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      model?: string;
    };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new ApiError(502, 'The AI provider returned an empty response.');

    const knowledge = opts.knowledge.slice(0, 4).map((k) => ({ title: k.title, source_type: k.source_type }));
    return {
      answer,
      provider: 'openrouter',
      model: data.model || opts.model,
      usedKnowledge: opts.knowledge.length > 0,
      citations: knowledge,
      tokensIn: data.usage?.prompt_tokens ?? estimateTokens(system + req.question),
      tokensOut: data.usage?.completion_tokens ?? estimateTokens(answer),
    };
  }
}

function buildSystemPrompt(req: AIRequest, opts: AIProviderOptions): string {
  let prompt = opts.systemPrompt;
  if (req.language && req.language !== 'en') {
    prompt += `\n\nThe learner's native language is ${req.language}. You may explain in that language when it helps, but always include Tamil script and English examples.`;
  }
  if (opts.knowledge.length) {
    prompt += `\n\n=== RELEVANT PLATFORM KNOWLEDGE (authoritative — prefer this over general knowledge) ===\n`;
    prompt += opts.knowledge
      .slice(0, 4)
      .map((k, i) => `[${i + 1}] (${k.source_type}) ${k.title}:\n${k.content.slice(0, 1200)}`)
      .join('\n\n');
    prompt += `\n=== END PLATFORM KNOWLEDGE ===`;
  }
  if (req.context?.text) {
    prompt += `\n\n=== CURRENT PAGE the learner is viewing ===\n${req.context.label}\n${req.context.text.slice(0, 1500)}\n=== END CURRENT PAGE ===`;
    prompt += `\nWhen the learner says "this lesson/word/page", they mean the content above.`;
  }
  prompt += `\n\nHARD RULES:
- If the answer is not in the platform knowledge or the current page and you are not certain, say honestly: "I couldn't find this in the learning materials."
- NEVER invent workshop dates, attendance records, certificate eligibility, payment status or user records. If asked about these, direct the learner to the relevant page or tell them to ask their teacher.
- Certificate eligibility and attendance are computed by the platform, not by you. You may explain the 90% rule but never promise eligibility.
- Keep answers concise, warm and encouraging. Use Tamil script with transliteration and English meaning for every Tamil word you teach.`;
  return prompt;
}
