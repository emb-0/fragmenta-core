import { describe, it, expect } from 'vitest';
import { parseKindleExport, contentHash, bookContentHash } from '@/lib/parser/kindle';

const SAMPLE_EXPORT = `The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 5 | location 72-74 | Added on Monday, March 15, 2024 3:22:14 PM

In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since.
==========
The Great Gatsby (F. Scott Fitzgerald)
- Your Highlight on page 7 | location 98-99 | Added on Monday, March 15, 2024 3:25:00 PM

So we beat on, boats against the current, borne back ceaselessly into the past.
==========
The Great Gatsby (F. Scott Fitzgerald)
- Your Note on page 7 | location 98-99 | Added on Monday, March 15, 2024 3:25:30 PM

This is the most famous line in the book
==========
1984 (George Orwell)
- Your Highlight on location 150-153 | Added on Tuesday, April 2, 2024 10:15:00 AM

It was a bright cold day in April, and the clocks were striking thirteen.
==========
1984 (George Orwell)
- Your Bookmark on location 200 | Added on Tuesday, April 2, 2024 10:30:00 AM


==========`;

describe('parseKindleExport', () => {
  it('parses books and highlights from Kindle export', () => {
    const result = parseKindleExport(SAMPLE_EXPORT);

    expect(result.books).toHaveLength(2);
    // The bookmark block has empty content after metadata, generating a warning
    expect(result.warnings.length).toBeLessThanOrEqual(1);

    const gatsby = result.books.find((b) => b.title === 'The Great Gatsby');
    expect(gatsby).toBeDefined();
    expect(gatsby!.author).toBe('F. Scott Fitzgerald');
    expect(gatsby!.highlights).toHaveLength(2);

    const orwell = result.books.find((b) => b.title === '1984');
    expect(orwell).toBeDefined();
    expect(orwell!.author).toBe('George Orwell');
    expect(orwell!.highlights).toHaveLength(1);
  });

  it('attaches notes to preceding highlights at same location', () => {
    const result = parseKindleExport(SAMPLE_EXPORT);
    const gatsby = result.books.find((b) => b.title === 'The Great Gatsby')!;

    // The second highlight should have the note attached
    const highlightWithNote = gatsby.highlights.find(
      (h) => h.text.includes('boats against the current'),
    );
    expect(highlightWithNote).toBeDefined();
    expect(highlightWithNote!.note).toBe('This is the most famous line in the book');
  });

  it('skips bookmarks', () => {
    const result = parseKindleExport(SAMPLE_EXPORT);
    const orwell = result.books.find((b) => b.title === '1984')!;
    // Should only have 1 highlight, not the bookmark
    expect(orwell.highlights).toHaveLength(1);
  });

  it('extracts location and date metadata', () => {
    const result = parseKindleExport(SAMPLE_EXPORT);
    const gatsby = result.books.find((b) => b.title === 'The Great Gatsby')!;
    const first = gatsby.highlights[0];
    expect(first.location).toBe('page 5, location 72-74');
    expect(first.date).toContain('March 15, 2024');
  });

  it('handles empty input', () => {
    const result = parseKindleExport('');
    expect(result.books).toHaveLength(0);
    expect(result.warnings).toHaveLength(1);
  });

  it('handles input with no valid blocks', () => {
    const result = parseKindleExport('some random text\n==========\n');
    expect(result.books).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('handles BOM and different line endings', () => {
    const withBOM = '\uFEFF' + SAMPLE_EXPORT.replace(/\n/g, '\r\n');
    const result = parseKindleExport(withBOM);
    expect(result.books).toHaveLength(2);
  });

  it('handles title without author in parentheses', () => {
    const input = `Some Book Without Author
- Your Highlight on location 10-12 | Added on Monday, January 1, 2024 12:00:00 PM

A highlight from a book without author info.
==========`;
    const result = parseKindleExport(input);
    expect(result.books).toHaveLength(1);
    expect(result.books[0].title).toBe('Some Book Without Author');
    expect(result.books[0].author).toBeNull();
  });

  it('handles page-only locations', () => {
    const input = `My Book (Author Name)
- Your Highlight on page 42 | Added on Monday, January 1, 2024 12:00:00 PM

A highlight with only a page number.
==========`;
    const result = parseKindleExport(input);
    expect(result.books[0].highlights[0].location).toBe('page 42');
  });

  it('handles location-only entries', () => {
    const input = `My Book (Author Name)
- Your Highlight on location 100-105 | Added on Monday, January 1, 2024 12:00:00 PM

A highlight with only a location range.
==========`;
    const result = parseKindleExport(input);
    expect(result.books[0].highlights[0].location).toBe('location 100-105');
  });
});

describe('contentHash', () => {
  it('produces consistent hashes', () => {
    const a = contentHash('hello world');
    const b = contentHash('hello world');
    expect(a).toBe(b);
  });

  it('normalizes whitespace and case', () => {
    const a = contentHash('  Hello World  ');
    const b = contentHash('hello world');
    expect(a).toBe(b);
  });

  it('produces different hashes for different content', () => {
    const a = contentHash('hello');
    const b = contentHash('world');
    expect(a).not.toBe(b);
  });
});

describe('bookContentHash', () => {
  it('produces consistent hashes for same book', () => {
    const a = bookContentHash('The Great Gatsby', 'F. Scott Fitzgerald');
    const b = bookContentHash('The Great Gatsby', 'F. Scott Fitzgerald');
    expect(a).toBe(b);
  });

  it('is case-insensitive', () => {
    const a = bookContentHash('THE GREAT GATSBY', 'f. scott fitzgerald');
    const b = bookContentHash('The Great Gatsby', 'F. Scott Fitzgerald');
    expect(a).toBe(b);
  });

  it('handles null author', () => {
    const a = bookContentHash('Untitled', null);
    const b = bookContentHash('Untitled', null);
    expect(a).toBe(b);
  });
});
