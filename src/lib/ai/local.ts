import type { DB } from '@/db';
import { estimateTokens, type AIProvider, type AIRequest, type AIResponse, type AIProviderOptions } from './provider';
import { retrieve } from './knowledge';

/** Short warm note in the learner's native language (offline provider). */
const NATIVE_NOTES: Record<string, string> = {
  zh: '欢迎！索莱（Solai）会一直用中文陪伴你学 Tamil。',
  hi: 'नमस्ते! हम आपकी अपनी भाषा में भी समझाने की कोशिश करते हैं।',
  es: '¡Hola! También te acompañamos en tu idioma mientras aprendes tamil.',
  fr: 'Bonjour ! Nous vous accompagnons aussi dans votre langue pour apprendre le tamoul.',
  ar: 'مرحباً! نرافقك بلغتك أيضاً أثناء تعلم اللغة التاميلية.',
  bn: 'নমস্কার! তামিল শেখার পথে আপনার নিজের ভাষাতেই আমরা পাশে আছি।',
  ru: 'Привет! Мы сопровождаем вас на вашем языке, пока вы изучаете тамильский.',
  pt: 'Olá! Também te acompanhamos no seu idioma enquanto você aprende tâmil.',
  id: 'Halo! Kami menemani kamu dalam bahasamu sendiri saat belajar bahasa Tamil.',
  te: 'నమస్కారం! మీ సొంత భాషలోనే సహాయం చేస్తాము.',
  ml: 'നമസ്കാരം! നിങ്ങളുടെ ഭാഷയിലും ഞങ്ങൾ ഒപ്പമുണ്ട്.',
  kn: 'ನಮಸ್ಕಾರ! ನಿಮ್ಮ ಸ್ವಂತ ಭಾಷೆಯಲ್ಲೂ ನಾವು ನಿಮ್ಮೊಂದಿಗೆ ಇರುತ್ತೇವೆ.',
};

/**
 * LocalProvider — a fully offline, deterministic tutor.
 * It answers strictly from indexed platform content (BM25 retrieval),
 * performs vocabulary lookups, and NEVER fabricates platform facts.
 * Used automatically when no OpenRouter key is configured (platform or BYOAI).
 */
export class LocalProvider implements AIProvider {
  readonly name = 'local';
  constructor(private db: DB) {}

  async complete(req: AIRequest, opts: AIProviderOptions): Promise<AIResponse> {
    const question = req.question.trim();
    let answer = '';
    let usedKnowledge = false;
    const citations: { title: string; source_type: string }[] = [];

    // 1) Vocabulary lookup (exact Tamil word / transliteration / meaning match)
    const vocabAnswer = this.tryVocabulary(question);
    if (vocabAnswer) {
      answer = vocabAnswer;
    }

    // 2) Retrieve knowledge chunks
    if (!answer) {
      const ctx = req.context;
      const lessonId = ctx?.type === 'lesson' ? ctx.id : undefined;
      const contextFilter = lessonId ? (c: { source_type: string; source_id: number }) => c.source_type === 'lesson' && c.source_id === lessonId : undefined;
      let chunks = contextFilter ? retrieve(this.db, question, 4, contextFilter) : [];
      let general = retrieve(this.db, question, 5);
      const all = chunks.length ? [...chunks, ...general.filter((g) => !chunks.some((c) => c.content === g.content))].slice(0, 4) : general.slice(0, 3);
      if (all.length) {
        usedKnowledge = true;
        answer = this.composeFromChunks(question, all, req);
        for (const c of all.slice(0, 3)) citations.push({ title: c.title, source_type: c.source_type });
      }
    }

    // 3) Nothing found — be honest, never fabricate
    if (!answer) {
      answer =
        `I couldn't find this in the learning materials. 🙏\n\n` +
        `Try one of these:\n` +
        `• Ask about a specific Tamil word (e.g. *what does வணக்கம் mean?*)\n` +
        `• Browse the [courses](/learn) and [vocabulary](/vocabulary)\n` +
        `• [Ask a teacher](/ask) — a real teacher will answer you`;
      if (req.context?.type === 'lesson') {
        answer += `\n• You are viewing **${req.context.label}** — ask me something from this lesson (e.g. *"explain the grammar in this lesson"*).`;
      }
    }


    // Greet the learner in their native language (when it isn't English)
    const note = req.language && req.language !== 'en' ? NATIVE_NOTES[req.language] : undefined;
    if (note) answer += `\n\n_${note}_`;

    return {
      answer,
      provider: 'local',
      model: 'solai-local-retrieval',
      usedKnowledge,
      citations,
      tokensIn: estimateTokens(question),
      tokensOut: estimateTokens(answer),
    };
  }

  private tryVocabulary(question: string): string | null {
    const q = question.trim();
    // Direct Tamil word or "what does X mean" / "translate X"
    const quoted = q.match(/[\u0B80-\u0BFF][\u0B80-\u0BFF\s]*/g);
    const meaningMatch = q.match(/(?:what does|meaning of|translate)\s+["“']?([^"”'?]+)/i);
    const candidates: string[] = [];
    if (quoted) candidates.push(...quoted.map((s) => s.trim()).filter((s) => s.length >= 2));
    if (meaningMatch) candidates.push(meaningMatch[1].trim());
    for (const cand of candidates) {
      const rows = this.db
        .prepare(
          `SELECT tamil, transliteration, meaning, part_of_speech, example_tamil, example_meaning, level
           FROM vocabulary WHERE is_published = 1 AND (tamil = ? OR transliteration = ? COLLATE NOCASE OR meaning = ? COLLATE NOCASE) LIMIT 3`
        )
        .all(cand, cand, cand) as unknown as { tamil: string; transliteration: string; meaning: string; part_of_speech: string | null; example_tamil: string | null; example_meaning: string | null; level: string | null }[];
      if (rows.length) {
        return rows
          .map(
            (r) =>
              `**${r.tamil}** (${r.transliteration})${r.part_of_speech ? ` · *${r.part_of_speech}*` : ''} — **${r.meaning}**` +
              (r.example_tamil ? `\nExample: ${r.example_tamil}${r.example_meaning ? ` — *${r.example_meaning}*` : ''}` : '')
          )
          .join('\n\n');
      }
    }
    return null;
  }

  private composeFromChunks(question: string, chunks: { content: string; title: string; score: number }[], req: AIRequest): string {
    const lines: string[] = [];
    lines.push(`Here is what I found in the learning materials:`);
    for (const c of chunks.slice(0, 2)) {
      const excerpt = this.bestExcerpt(c.content, question, 340);
      lines.push(`\n📚 **${c.title}**\n${excerpt}`);
    }
    if (req.context?.type === 'lesson' && req.context.label) {
      lines.push(`\nYou're currently in **${req.context.label}** — ask me about any word or sentence from it.`);
    }
    lines.push(`\n_Want a deeper explanation or practice sentences? [Ask a teacher](/ask) for a human answer._`);
    return lines.join('\n');
  }

  private bestExcerpt(content: string, question: string, maxLen: number): string {
    const qTokens = new Set(question.toLowerCase().split(/[^\w\u0B80-\u0BFF]+/).filter((t) => t.length > 2));
    const sentences = content.split(/(?<=[.!?।])\s+|\n+/);
    let best = '';
    let bestScore = -1;
    for (const s of sentences) {
      if (!s.trim()) continue;
      const lower = s.toLowerCase();
      let score = 0;
      for (const t of qTokens) if (lower.includes(t)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = s.trim();
      }
    }
    if (best.length > maxLen) best = best.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
    return best || content.slice(0, maxLen);
  }
}
