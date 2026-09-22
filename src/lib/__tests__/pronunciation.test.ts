import { describe, expect, it } from 'vitest';
import { compareSentences, feedbackForScore, levenshtein, normalizeTamil } from '@/lib/pronunciation';

describe('normalizeTamil', () => {
  it('lowercases, strips punctuation and collapses whitespace', () => {
    expect(normalizeTamil('  Vanakkam!  நன்றி??  ')).toBe('vanakkam நன்றி');
  });
});

describe('levenshtein', () => {
  it('is 0 for identical strings', () => {
    expect(levenshtein('vanakkam', 'vanakkam')).toBe(0);
  });

  it('handles empty strings', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
    expect(levenshtein('', '')).toBe(0);
  });

  it('computes the classic kitten→sitting distance of 3', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('counts a single transposition as 2 edits', () => {
    expect(levenshtein('venum', 'venmu')).toBe(2);
  });
});

describe('compareSentences', () => {
  it('scores a perfect match 100', () => {
    const r = compareSentences('vanakkam enna venum', 'vanakkam enna venum');
    expect(r.score).toBe(100);
    expect(r.matchedCount).toBe(3);
    expect(r.total).toBe(3);
    expect(r.words.every((w) => w.matched && w.similarity === 1)).toBe(true);
  });

  it('counts near-miss words (similarity ≥ 0.72) as matched', () => {
    // 'venum' said as 'venm' — one deletion, similarity 0.8
    const r = compareSentences('naan oru theenir venum', 'naan oru theenir venm');
    expect(r.matchedCount).toBe(4);
    expect(r.score).toBe(100);
  });

  it('marks clearly wrong words as unmatched and scores proportionally', () => {
    const r = compareSentences('vanakkam enna venum', 'vanakkam hello venum');
    expect(r.total).toBe(3);
    expect(r.matchedCount).toBe(2);
    expect(r.score).toBe(67);
    const hello = r.words.find((w) => w.word === 'hello' || w.word === 'enna');
    expect(hello).toBeDefined();
    expect(hello!.matched).toBe(false);
  });

  it('ignores extra spoken words beyond the expected sentence', () => {
    const r = compareSentences('nandri', 'nandri nandri nandri');
    expect(r.score).toBe(100);
  });

  it('returns an empty result for an empty expected sentence', () => {
    expect(compareSentences('', 'anything')).toEqual({ words: [], score: 0, matchedCount: 0, total: 0 });
  });

  it('works with Tamil script', () => {
    const r = compareSentences('வணக்கம் நன்றி', 'வணக்கம் நன்றி');
    expect(r.score).toBe(100);
    const bad = compareSentences('வணக்கம் நன்றி', 'வணக்கம் என்ன');
    expect(bad.matchedCount).toBe(1);
  });
});

describe('feedbackForScore', () => {
  it('returns the right feedback band per score', () => {
    expect(feedbackForScore(95).label).toBe('Excellent');
    expect(feedbackForScore(75).label).toBe('Good');
    expect(feedbackForScore(50).label).toBe('Getting there');
    expect(feedbackForScore(10).label).toBe('Keep practicing');
  });

  it('always includes an encouraging message', () => {
    for (const s of [0, 39, 40, 69, 70, 89, 90, 100]) {
      expect(feedbackForScore(s).message.length).toBeGreaterThan(10);
    }
  });
});
