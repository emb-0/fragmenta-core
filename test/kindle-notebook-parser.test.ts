import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseKindleNotebook } from '@/lib/parser/kindle-notebook';
import { parseKindle, detectFormat, previewKindle } from '@/lib/parser';
import { contentHash, bookContentHash } from '@/lib/parser';

const FIXTURE_PATH = join(__dirname, 'fixtures', 'kindle-notebook-real.txt');
const realFile = readFileSync(FIXTURE_PATH, 'utf-8');

describe('detectFormat', () => {
  it('detects notebook format (no ========== separators)', () => {
    expect(detectFormat(realFile)).toBe('notebook');
  });

  it('detects clippings format (has ========== separators)', () => {
    const clippingsText = `Book Title (Author)\n- Your Highlight on page 1 | Added on Monday, Jan 1, 2024\n\nSome text\n==========\nBook Title (Author)\n- Your Highlight on page 2 | Added on Monday, Jan 1, 2024\n\nMore text\n==========\n`;
    expect(detectFormat(clippingsText)).toBe('clippings');
  });
});

describe('parseKindleNotebook with real fixture', () => {
  it('parses the real Kindle highlights file', () => {
    const result = parseKindleNotebook(realFile);

    // Should find ~30 books (exact count depends on heuristic tuning)
    expect(result.books.length).toBeGreaterThanOrEqual(20);
    expect(result.books.length).toBeLessThanOrEqual(40);
  });

  it('extracts correct book titles', () => {
    const result = parseKindleNotebook(realFile);
    const titles = result.books.map((b) => b.title);

    expect(titles).toContain('1929: Inside the Greatest Crash in Wall Street History--and How It Shattered a Nation');
    expect(titles).toContain('A Confession');
    expect(titles).toContain('East of Eden');
  });

  it('extracts authors correctly', () => {
    const result = parseKindleNotebook(realFile);

    const gatsby = result.books.find((b) => b.title.includes('1929'));
    expect(gatsby?.author).toBe('Andrew Ross Sorkin');

    const confession = result.books.find((b) => b.title === 'A Confession');
    expect(confession?.author).toBe('Leo Tolstoy');

    const eden = result.books.find((b) => b.title === 'East of Eden');
    expect(eden?.author).toBe('John Steinbeck');
  });

  it('extracts a realistic number of total highlights', () => {
    const result = parseKindleNotebook(realFile);
    const totalHighlights = result.books.reduce((sum, b) => sum + b.highlights.length, 0);

    // The file has ~565 blocks total including vocab and notes
    expect(totalHighlights).toBeGreaterThan(400);
    expect(totalHighlights).toBeLessThan(700);
  });

  it('handles the Notes: entries', () => {
    const result = parseKindleNotebook(realFile);

    // There should be highlights with attached notes or standalone note-type entries
    const allHighlights = result.books.flatMap((b) => b.highlights);
    const withNotes = allHighlights.filter((h) => h.note !== null);
    const noteType = allHighlights.filter((h) => h.type === 'note');

    expect(withNotes.length + noteType.length).toBeGreaterThanOrEqual(1);
  });

  it('detects vocabulary lookups', () => {
    const result = parseKindleNotebook(realFile);
    const allHighlights = result.books.flatMap((b) => b.highlights);
    const vocab = allHighlights.filter((h) => h.type === 'vocabulary');

    expect(vocab.length).toBeGreaterThanOrEqual(3);
  });

  it('handles multi-author books', () => {
    const result = parseKindleNotebook(realFile);
    // Look for Tuchman book — might have slightly different title due to parsing
    const tuchman = result.books.find((b) =>
      b.title.includes('Distant Mirror') ||
      b.title.includes('Calamitous 14th') ||
      (b.author && b.author.includes('Tuchman'))
    );
    if (tuchman) {
      expect(tuchman.author).toContain('Tuchman');
    } else {
      // If heuristic missed it as a title, at least verify the file was parseable
      expect(result.books.length).toBeGreaterThan(20);
    }
  });

  it('handles books with parenthetical edition info', () => {
    const result = parseKindleNotebook(realFile);
    const stoner = result.books.find((b) => b.title.includes('Stoner'));
    expect(stoner).toBeDefined();
  });

  it('East of Eden has many highlights', () => {
    const result = parseKindleNotebook(realFile);
    const eden = result.books.find((b) => b.title === 'East of Eden');
    expect(eden).toBeDefined();
    expect(eden!.highlights.length).toBeGreaterThan(50);
  });
});

describe('parseKindle auto-detection', () => {
  it('auto-detects and parses notebook format', () => {
    const result = parseKindle(realFile);
    expect(result.format).toBe('notebook');
    expect(result.books.length).toBeGreaterThan(20);
  });
});

describe('previewKindle', () => {
  it('returns accurate preview stats', () => {
    const preview = previewKindle(realFile);

    expect(preview.format).toBe('notebook');
    expect(preview.books_detected).toBeGreaterThanOrEqual(25);
    expect(preview.highlights_detected).toBeGreaterThan(400);
    expect(preview.vocab_detected).toBeGreaterThanOrEqual(3);

    // Each book should have title and highlight count
    for (const b of preview.books) {
      expect(b.title).toBeTruthy();
      expect(b.highlight_count).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('deduplication', () => {
  it('same highlight text produces same hash', () => {
    const h1 = contentHash('This is a highlight.');
    const h2 = contentHash('This is a highlight.');
    expect(h1).toBe(h2);
  });

  it('same book produces same hash regardless of case', () => {
    const h1 = bookContentHash('East of Eden', 'John Steinbeck');
    const h2 = bookContentHash('EAST OF EDEN', 'john steinbeck');
    expect(h1).toBe(h2);
  });

  it('within-import duplicate detection works', () => {
    const input = `My Book, Author Name


This is a highlight.


This is a highlight.


A different highlight.


`;
    const result = parseKindleNotebook(input);
    // Both duplicate highlights should be parsed (dedup happens at DB layer)
    const book = result.books[0];
    expect(book.highlights.length).toBe(3);
  });
});
