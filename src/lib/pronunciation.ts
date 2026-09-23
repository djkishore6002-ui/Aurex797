/**
 * Speaking-practice scoring: pure, deterministic, unit-testable.
 * Compares the expected sentence with the speech-recognition output at the
 * word level. This is educational feedback — NOT medical-grade or
 * professional pronunciation analysis.
 */

export function normalizeTamil(s: string): string {
  return s
    .toLowerCase()
    .replace(/[?!।.,"'()\[\]।]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export interface WordDiff {
  word: string;
  matched: boolean; // recognition had a close-enough word
  recognized: string | null;
  similarity: number; // 0..1
}

/**
 * Align expected words against recognized words (greedy best similarity).
 * Returns per-word results plus an overall score (0–100).
 */
export function compareSentences(expected: string, recognized: string): { words: WordDiff[]; score: number; matchedCount: number; total: number } {
  const expWords = normalizeTamil(expected).split(' ').filter(Boolean);
  const recWords = normalizeTamil(recognized).split(' ').filter(Boolean);
  if (expWords.length === 0) return { words: [], score: 0, matchedCount: 0, total: 0 };

  const used = new Set<number>();
  const words: WordDiff[] = expWords.map((w) => {
    // Exact (or near-exact) match first
    let bestIdx = -1;
    let bestSim = -1;
    for (let j = 0; j < recWords.length; j++) {
      if (used.has(j)) continue;
      const rw = recWords[j];
      let sim = 0;
      if (rw === w) sim = 1;
      else {
        const d = levenshtein(w, rw);
        sim = Math.max(0, 1 - d / Math.max(w.length, rw.length));
      }
      if (sim > bestSim) {
        bestSim = sim;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0 && bestSim >= 0.72) {
      used.add(bestIdx);
      return { word: w, matched: true, recognized: recWords[bestIdx], similarity: bestSim };
    }
    return { word: w, matched: false, recognized: null, similarity: bestSim >= 0 ? bestSim : 0 };
  });

  const matchedCount = words.filter((w) => w.matched).length;
  const score = Math.round((matchedCount / expWords.length) * 100);
  return { words, score, matchedCount, total: expWords.length };
}

export function feedbackForScore(score: number): { label: string; message: string } {
  if (score >= 90) return { label: 'Excellent', message: 'அருவா! That is nearly perfect — great rhythm and words.' };
  if (score >= 70) return { label: 'Good', message: 'வணக்கம் — very good! A couple of words to polish (highlighted below).' };
  if (score >= 40) return { label: 'Getting there', message: 'Good effort. Try the highlighted words again slowly, then say the whole sentence.' };
  return { label: 'Keep practicing', message: 'Try once more — read the sentence aloud first, then repeat it slowly. This is normal for a first attempt!' };
}
