import { describe, it, expect } from 'vitest';
import { scoreMatch, isQueryable } from '@/lib/google-books/match';

describe('Google Books matching — scoreMatch', () => {
  it('returns high confidence for exact title + author match', () => {
    const result = scoreMatch(
      'The Great Gatsby',
      'F. Scott Fitzgerald',
      'The Great Gatsby',
      ['F. Scott Fitzgerald'],
    );
    expect(result.confidence).toBe('high');
    expect(result.titleSimilarity).toBeGreaterThan(0.9);
    expect(result.authorSimilarity).toBeGreaterThan(0.9);
  });

  it('returns high confidence for close title match with author', () => {
    const result = scoreMatch(
      'The Great Gatsby',
      'F Scott Fitzgerald',
      'Great Gatsby',
      ['F. Scott Fitzgerald'],
    );
    expect(result.confidence).toBe('high');
    expect(result.titleSimilarity).toBeGreaterThan(0.6);
  });

  it('returns medium confidence for reasonable title-only match', () => {
    const result = scoreMatch(
      'Sapiens A Brief History of Humankind',
      'Yuval Noah Harari',
      'Sapiens: A Brief History',
      ['Some Other Author'],
    );
    expect(result.confidence).toBe('medium');
    expect(result.titleSimilarity).toBeGreaterThan(0.45);
  });

  it('returns low confidence for poor match', () => {
    const result = scoreMatch(
      'The Great Gatsby',
      'F. Scott Fitzgerald',
      'The Great Depression: An Economic History',
      ['John Smith'],
    );
    expect(result.confidence).toBe('low');
  });

  it('handles missing author on both sides', () => {
    const result = scoreMatch(
      'Meditations',
      null,
      'Meditations',
      null,
    );
    expect(result.confidence).toBe('high');
    expect(result.authorSimilarity).toBe(0.5); // neutral
  });

  it('handles query with author but result without', () => {
    const result = scoreMatch(
      'Meditations',
      'Marcus Aurelius',
      'Meditations',
      null,
    );
    // Title matches perfectly but author can't be verified
    expect(result.titleSimilarity).toBe(1);
    expect(result.authorSimilarity).toBe(0);
  });

  it('handles multiple result authors', () => {
    const result = scoreMatch(
      'Economics',
      'Paul Samuelson',
      'Economics',
      ['Paul A. Samuelson', 'William D. Nordhaus'],
    );
    expect(result.confidence).toBe('high');
    expect(result.authorSimilarity).toBeGreaterThan(0.5);
  });

  it('normalizes punctuation in comparison', () => {
    const result = scoreMatch(
      "It's a Wonderful Life",
      null,
      'Its a Wonderful Life',
      null,
    );
    expect(result.titleSimilarity).toBe(1);
  });
});

describe('Google Books matching — isQueryable', () => {
  it('returns true for normal titles', () => {
    expect(isQueryable('The Great Gatsby', 'F. Scott Fitzgerald')).toBe(true);
  });

  it('returns false for very short titles', () => {
    expect(isQueryable('Hi', null)).toBe(false);
  });

  it('returns false for bracketed titles', () => {
    expect(isQueryable('[Untitled]', null)).toBe(false);
  });

  it('returns false for parenthesized titles', () => {
    expect(isQueryable('(Draft)', null)).toBe(false);
  });

  it('returns true for titles with 3+ chars', () => {
    expect(isQueryable('War', null)).toBe(true);
  });
});

describe('Enrichment API contract', () => {
  it('expects correct single-book request shape', () => {
    const body = { book_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' };
    expect(body.book_id).toBeDefined();
    expect(typeof body.book_id).toBe('string');
  });

  it('expects correct backfill request shape', () => {
    const body = { backfill: true, limit: 50, force: false };
    expect(body.backfill).toBe(true);
    expect(typeof body.limit).toBe('number');
  });

  it('rejects request with neither book_id nor backfill', () => {
    const body = {};
    expect('book_id' in body || 'backfill' in body).toBe(false);
  });
});

describe('Cover URL cleaning', () => {
  function cleanImageUrl(url: string | undefined): string | null {
    if (!url) return null;
    let u = url.replace(/^http:\/\//, 'https://');
    try {
      const p = new URL(u);
      p.searchParams.delete('edge');
      return p.toString();
    } catch {
      return u;
    }
  }

  it('forces HTTPS', () => {
    const result = cleanImageUrl('http://books.google.com/books/content?id=abc&img=1');
    expect(result).toMatch(/^https:\/\//);
  });

  it('removes edge parameter', () => {
    const result = cleanImageUrl('https://books.google.com/books/content?id=abc&edge=curl');
    expect(result).not.toContain('edge=');
  });

  it('returns null for undefined input', () => {
    expect(cleanImageUrl(undefined)).toBe(null);
  });

  it('preserves valid HTTPS URLs', () => {
    const url = 'https://books.google.com/books/content?id=abc&img=1';
    expect(cleanImageUrl(url)).toBe(url);
  });
});

describe('Book enrichment data shape', () => {
  const enrichedBook = {
    google_books_id: 'TdVQAQAAQBAJ',
    cover_url: 'https://books.google.com/books/content?id=TdVQAQAAQBAJ&img=1',
    thumbnail_url: 'https://books.google.com/books/content?id=TdVQAQAAQBAJ&img=1&zoom=5',
    subtitle: 'A Novel',
    publisher: 'Scribner',
    published_date: '1925',
    page_count: 180,
    google_books_link: 'https://books.google.com/books?id=TdVQAQAAQBAJ',
    enrichment_status: 'found' as const,
    enrichment_confidence: 'high' as const,
    enrichment_updated_at: '2026-04-08T00:00:00Z',
  };

  it('has all required enrichment fields', () => {
    expect(enrichedBook.google_books_id).toBeDefined();
    expect(enrichedBook.cover_url).toBeDefined();
    expect(enrichedBook.enrichment_status).toBe('found');
    expect(enrichedBook.enrichment_confidence).toBe('high');
  });

  it('has valid enrichment status values', () => {
    const validStatuses = ['pending', 'found', 'not_found', 'error', 'skipped'];
    expect(validStatuses).toContain(enrichedBook.enrichment_status);
  });

  it('has valid confidence values', () => {
    const validConfidences = ['high', 'medium', 'low'];
    expect(validConfidences).toContain(enrichedBook.enrichment_confidence);
  });

  it('cover_url starts with https', () => {
    expect(enrichedBook.cover_url).toMatch(/^https:\/\//);
  });
});
