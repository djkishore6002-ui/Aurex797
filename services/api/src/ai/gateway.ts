import { db } from '../db';
import { config } from '../config';
import { decryptKey } from '../utils/helpers';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  userMessage: string;
  systemPrompt?: string;
  history?: ChatMessage[];
  userId: string;
  context?: Record<string, unknown>;
}

export interface AIResponse {
  reply: string;
  model: string;
  provider: string;
}

interface ProviderSettings {
  mode: 'platform' | 'byoai';
  provider: 'openrouter' | 'mock';
  encrypted_key: string | null;
  model: string | null;
}

function getProviderSettings(userId: string): ProviderSettings {
  const row = db.prepare('SELECT mode, provider, encrypted_key, model FROM ai_provider_settings WHERE user_id=?').get(userId) as ProviderSettings | undefined;
  if (row) return row;
  return { mode: 'platform', provider: config.openRouterKey ? 'openrouter' : 'mock', encrypted_key: null, model: null };
}

async function callOpenRouter(apiKey: string, model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.webUrl,
      'X-Title': 'Aurex Tamil Learning',
    },
    body: JSON.stringify({
      model: model || 'openrouter/auto',
      messages,
      temperature: 0.5,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 300)}`);
  }
  const data = await res.json() as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? '(No response)';
}

// Knowledge-based fallback answers (used when no API key is available).
// Always educational; never gives fake personal data or makes certificate decisions.
function mockReply(userMessage: string, context?: Record<string, unknown>): string {
  const msg = userMessage.toLowerCase().trim();
  const tamilChar = /[\u0B80-\u0BFF]/.test(userMessage);

  if (/vanakkam|வணக்கம்|hello|hi|namaste/.test(msg)) {
    return 'வணக்கம்! (Vanakkam!) — Hello! I\'m your Tamil tutor. Try asking: "How do I say \'I want water\' in Tamil?" or "Explain the word நன்றி".';
  }
  if (/thank|நன்றி|nandri/.test(msg)) {
    return 'நன்றி (Nanri) = Thank you. Response: அதற்கொன்றுமில்லை (Adharkondrum illai) = You\'re welcome / It\'s nothing.';
  }
  if (/water|தண்ணீர்|thanni|tanni/.test(msg)) {
    return 'தண்ணீர் (taṇṇīr) = Water. Common phrase: "தயவுசெய்து தண்ணீர் கொடுங்கள்" (Tayavu ceytu taṇṇīr koṭuṅkaḷ) = "Please give me water". (Formal/polite form.)';
  }
  if (/food|சாப்பாடு|sappadu|saapadu/.test(msg)) {
    return 'சாப்பாடு (sāppāṭu) = food / meal. Ask "சாப்பிட்டீர்களா?" (sāppiṭṭīrkaḷā?) = "Have you eaten?" — a common friendly greeting in Tamil Nadu.';
  }
  if (/alphabet|எழுத்து|eluthu|uyir|mei/.test(msg)) {
    return 'Tamil has 12 உயிரெழுத்து (uyir / vowels) and 18 மெய்யெழுத்து (mei / consonants). They combine into 216 உயிர்மெய் (uyirmei) compound characters. Start with: அ (a), ஆ (aa), இ (i), ஈ (ii); க் (k), ச் (ch), ட் (t hard).';
  }
  if (/pronoun|நான்|naan|i |we/.test(msg) && /i |நான்/.test(msg + ' ')) {
    return 'First-person pronouns: நான் (Nān) = I (formal/standard). நா (Nā) = I (colloquial). எங்கள் / நம்ம (Engaḷ / Namma) = our/we. Example: நான் தமிழ் கற்கிறேன் (Nān tamiḷ kaṟkiṟēn) = I am learning Tamil.';
  }
  if (/explain|விளக்கு|vilakku|mean/.test(msg) && tamilChar) {
    return `You used a Tamil word — great! Look it up in the Vocabulary tab or share it in the community. I'll note that your context is: ${JSON.stringify(context ?? {})}. Keep practicing!`;
  }
  if (/quiz|test|question/.test(msg)) {
    return 'Try this: "வணக்கம்" means:  A) Goodbye  B) Hello/Greetings  C) Sorry  D) Thank you. Reply with A, B, C, or D and I\'ll explain!';
  }
  if (/^[abcd]\b/.test(msg)) {
    const ans = msg.trim()[0];
    if (ans === 'b') return '✓ Correct! வணக்கம் (Vanakkam) means hello/greetings. +5 XP!';
    return 'Not quite — the answer was B) Hello/Greetings. வணக்கம் is used throughout the day as a polite greeting.';
  }
  if (/certificate|சான்றிதழ்/.test(msg)) {
    return 'Certificate eligibility is determined by attendance only: you must attend ≥90% of required minutes. This rule is applied automatically by the system — I cannot grant or override certificates.';
  }
  return `I'm here to help with Tamil! Ask me about: vocabulary (e.g. "How do I say water?"), grammar ("How do pronouns work?"), alphabets ("uyir eluthukkal"), or common phrases. ${tamilChar ? 'You wrote in Tamil — nice try! ' : ''}Keep practicing daily to maintain your streak.`;
}

export async function generate(req: AIRequest): Promise<AIResponse> {
  const settings = getProviderSettings(req.userId);

  const systemPrompt = req.systemPrompt ??
    `You are a helpful Tamil-language tutor for beginners. You are friendly, encouraging, and accurate.
RULES:
- Stay within educational Tamil-language scope.
- If you are unsure, say so clearly.
- Do NOT decide certificate eligibility; certificates are based on >=90% attendance computed by the system.
- Do NOT reveal private information about other users.
- Use Tamil script AND transliteration AND translation to the learner's language.
- Keep answers concise (2-6 sentences unless asked for more).
- Do NOT claim human teacher approval unless a teacher has approved your answer.
Context: ${JSON.stringify(req.context ?? {})}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...(req.history ?? []),
    { role: 'user', content: req.userMessage },
  ];

  let reply: string;
  let provider = 'mock';
  let model = 'aurex-local-v1';

  try {
    if (settings.mode === 'byoai' && settings.encrypted_key) {
      const key = decryptKey(settings.encrypted_key);
      if (key) {
        provider = 'openrouter';
        model = settings.model || 'openrouter/auto';
        reply = await callOpenRouter(key, model, messages);
        return { reply, provider, model };
      }
    }
    if (config.openRouterKey && settings.provider === 'openrouter') {
      provider = 'openrouter';
      model = config.aiPlatformModel;
      reply = await callOpenRouter(config.openRouterKey, model, messages);
      return { reply, provider, model };
    }
  } catch (e) {
    // Fall back gracefully to mock
    reply = `(AI provider error: ${(e as Error).message}) ` + mockReply(req.userMessage, req.context);
    return { reply, provider: 'fallback', model };
  }

  reply = mockReply(req.userMessage, req.context);
  return { reply, provider, model };
}

export async function testConnection(mode: 'platform' | 'byoai', apiKey?: string, model?: string): Promise<{ ok: boolean; message: string; latencyMs?: number }> {
  const t0 = Date.now();
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Reply with a single word: PONG.' },
      { role: 'user', content: 'ping' },
    ];
    if (mode === 'byoai') {
      if (!apiKey) return { ok: false, message: 'API key required' };
      await callOpenRouter(apiKey, model || 'openrouter/auto', messages);
    } else if (config.openRouterKey) {
      await callOpenRouter(config.openRouterKey, config.aiPlatformModel, messages);
    } else {
      // mock is always ok
      return { ok: true, message: 'Connected (mock/fallback provider)', latencyMs: Date.now() - t0 };
    }
    return { ok: true, message: 'Connection successful', latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
