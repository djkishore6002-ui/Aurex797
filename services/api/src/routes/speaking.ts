import { Router } from 'express';
import { z } from 'zod';
import { authRequired, AuthRequest } from '../middleware/auth';
import { ok } from '../utils/helpers';

const router = Router();

// Speaking practice: compare transcript against expected sentence.
// Heuristic only — no medical-grade pronunciation scoring.
const practiceSchema = z.object({
  expected: z.string().min(1),
  transcript: z.string().min(1),
});
router.post('/analyze', authRequired, (req: AuthRequest, res) => {
  const parsed = practiceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.issues[0] });
  const expected = parsed.data.expected.trim().toLowerCase();
  const transcript = parsed.data.transcript.trim().toLowerCase();

  // Normalize whitespace/punctuation.
  const norm = (s: string) => s.replace(/[\u0B80-\u0BFF]/g, c => c) // keep Tamil
    .replace(/[.,!?;:"']/g, '').replace(/\s+/g, ' ').trim();
  const e = norm(expected);
  const t = norm(transcript);

  const expectedWords = e.split(' ').filter(Boolean);
  const transcriptWords = t.split(' ').filter(Boolean);
  const missing = expectedWords.filter(w => !transcriptWords.includes(w));
  const extra = transcriptWords.filter(w => !expectedWords.includes(w));

  // Levenshtein-ish character similarity
  const charSimilarity = (a: string, b: string) => {
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    if (longer.length === 0) return 1;
    const matches = [...shorter].filter((c, i) => c === longer[i]).length;
    return matches / longer.length;
  };
  const charSim = charSimilarity(e, t);
  const wordAccuracy = Math.max(0, 1 - (missing.length / Math.max(expectedWords.length, 1)));
  const score = Math.round((charSim * 0.6 + wordAccuracy * 0.4) * 100);

  let feedback: string;
  if (score >= 90) feedback = 'Excellent! Your pronunciation sounds very close. Keep practicing!';
  else if (score >= 70) feedback = 'Good effort! A few words need more practice.';
  else if (score >= 50) feedback = 'You\'re getting there! Try slowing down and focusing on each word.';
  else feedback = 'Let\'s try again — listen to the phrase and repeat after it.';

  res.json(ok({
    score,
    sentence_correctness: wordAccuracy >= 0.8,
    pronunciation_approximation: charSim,
    missing_words: missing.slice(0, 5),
    extra_words: extra.slice(0, 5),
    feedback,
    note: 'Pronunciation score is an approximation using word/character similarity. It is not a clinical or certified pronunciation assessment.',
  }));
});

// Practice prompt list per level
router.get('/prompts', (_req, res) => {
  res.json(ok({
    prompts: [
      { level: 'absolute_beginner', tamil: 'வணக்கம்', transliteration: 'Vanakkam', meaning: 'Hello' },
      { level: 'absolute_beginner', tamil: 'நன்றி', transliteration: 'Nanri', meaning: 'Thank you' },
      { level: 'beginner', tamil: 'தயவுசெய்து தண்ணீர் கொடுங்கள்', transliteration: 'Tayavu ceytu taṇṇīr koṭuṅkaḷ', meaning: 'Please give me water' },
      { level: 'beginner', tamil: 'என் பெயர்', transliteration: 'En peyar', meaning: 'My name is' },
      { level: 'intermediate', tamil: 'நான் தமிழ் கற்கிறேன்', transliteration: 'Nān tamiḷ kaṟkiṟēn', meaning: 'I am learning Tamil' },
      { level: 'intermediate', tamil: 'இன்று உணவு மிகவும் சுவையாக இருக்கிறது', transliteration: 'Iṉṟu uṇavu mikavum cuvaiyāka irukkiṟatu', meaning: 'Today the food is very tasty' },
    ],
  }));
});

export default router;
