import { describe, expect, it } from 'vitest';
import { chunkText, indexSource, markStale, removeSource, retrieve, tokenize } from '@/lib/ai/knowledge';
import { freshDb } from './helpers';

describe('chunkText', () => {
  it('returns [] for empty/whitespace input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    expect(chunkText('வணக்கம் — hello, how are you?')).toHaveLength(1);
  });

  it('splits long text into ≤700-char chunks that overlap', () => {
    const long = Array.from({ length: 60 }, (_, i) => `Sentence number ${i} talks about Tamil grammar, numbers and practice.`).join(' ');
    const chunks = chunkText(long);
    expect(chunks.length).toBeGreaterThan(4);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(700);
    // consecutive chunks overlap (the start of chunk n+1 appears inside chunk n)
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i - 1]!.includes(chunks[i]!.slice(0, 40))).toBe(true);
    }
    // no content lost: every sentence appears somewhere
    for (let i = 0; i < 60; i++) {
      expect(chunks.some((c) => c.includes(`Sentence number ${i} `))).toBe(true);
    }
  });
});

describe('tokenize', () => {
  it('tokenizes Latin and Tamil script, lowercased, ignoring digits', () => {
    const t = tokenize('Vanakkam நன்றி hello-world 2026');
    expect(t).toContain('vanakkam');
    expect(t).toContain('நன்றி');
    expect(t).toContain('hello');
    expect(t).toContain('world');
    expect(t.some((x) => x === '2026')).toBe(false);
  });

  it('indexes Tamil word prefixes for recall', () => {
    const t = tokenize('தேநீர்கடை'); // >4 Tamil chars → also indexes half prefix
    expect(t).toContain('தேநீர்கடை');
    expect(t).toContain('தேநீர்கடை'.slice(0, Math.ceil('தேநீர்கடை'.length / 2)));
  });
});

describe('indexSource + retrieve (offline BM25)', () => {
  it('retrieves the most relevant document for a query', () => {
    const db = freshDb();
    indexSource(
      db,
      'lesson',
      1,
      'Greetings in Tamil',
      'Learn vanakkam, nandri and other greetings. Vanakkam means hello. Good morning in Tamil is vanakkam. Thank you is nandri.'
    );
    indexSource(
      db,
      'lesson',
      2,
      'Trains and travel',
      'Buy a train ticket at the station. Chennai Egmore station is busy. Ask where the platform is. Trains leave on time.'
    );

    const hits = retrieve(db, 'How do I say greetings and vanakkam?');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.title).toBe('Greetings in Tamil');

    const trainHits = retrieve(db, 'train station ticket Chennai');
    expect(trainHits[0]!.title).toBe('Trains and travel');
  });

  it('returns nothing for unknown content (no hallucinated chunks)', () => {
    const db = freshDb();
    indexSource(db, 'lesson', 1, 'Greetings in Tamil', 'Learn vanakkam, nandri and other greetings in Tamil.');
    expect(retrieve(db, 'quantum physics black holes zzz')).toEqual([]);
  });

  it('stops serving a document once it is marked stale', () => {
    const db = freshDb();
    indexSource(db, 'lesson', 1, 'Greetings in Tamil', 'Learn vanakkam, nandri and other greetings in Tamil.');
    indexSource(db, 'lesson', 2, 'Numbers', 'Learn one two three four five in Tamil, onnu rendu moolu.');
    markStale(db, 'lesson', 1);
    const hits = retrieve(db, 'vanakkam greetings');
    expect(hits.every((h) => h.source_id !== 1)).toBe(true);
  });

  it('re-indexing replaces the previous chunks (no duplicates)', () => {
    const db = freshDb();
    indexSource(db, 'lesson', 1, 'Greetings v1', 'Vanakkam means hello. Nandri means thank you. Greetings lesson content.');
    indexSource(db, 'lesson', 1, 'Greetings v2', 'Vanakkam means hello. Updated greetings text for the second version.');
    const docCount = db.prepare('SELECT COUNT(*) c FROM ai_knowledge_documents').get() as unknown as { c: number };
    expect(docCount.c).toBe(1);
    const hits = retrieve(db, 'vanakkam hello');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.title === 'Greetings v2')).toBe(true);
  });

  it('removeSource deletes the document and its chunks', () => {
    const db = freshDb();
    indexSource(db, 'lesson', 1, 'Greetings in Tamil', 'Learn vanakkam, nandri and other greetings in Tamil.');
    removeSource(db, 'lesson', 1);
    expect(retrieve(db, 'vanakkam')).toEqual([]);
    expect((db.prepare('SELECT COUNT(*) c FROM ai_knowledge_chunks').get() as unknown as { c: number }).c).toBe(0);
  });
});
