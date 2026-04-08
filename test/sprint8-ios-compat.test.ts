import { describe, it, expect } from 'vitest';
import {
  transformBook,
  transformBooks,
  transformBookRef,
  transformHighlight,
  transformCollection,
  transformSearchResult,
  buildPagination,
  pageToOffset,
} from '@/lib/api/ios-compat';
import type { Book, Highlight, Collection, SearchResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockBook: Book = {
  id: '11111111-1111-1111-1111-111111111111',
  canonical_title: 'The Great Gatsby',
  canonical_author: 'F. Scott Fitzgerald',
  source_title_raw: 'The Great Gatsby',
  source_author_raw: 'F. Scott Fitzgerald',
  content_hash: 'abc123',
  highlight_count: 42,
  note_count: 5,
  first_imported_at: '2024-01-01T00:00:00Z',
  last_imported_at: '2024-06-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-06-01T00:00:00Z',
  google_books_id: 'gb_123',
  cover_url: 'https://books.google.com/books/content?id=gb_123',
  thumbnail_url: 'https://books.google.com/books/content?id=gb_123&thumb=1',
  subtitle: null,
  publisher: 'Scribner',
  published_date: '1925',
  page_count: 218,
  google_books_link: 'https://books.google.com/books?id=gb_123',
  enrichment_status: 'found',
  enrichment_confidence: 'high',
  enrichment_updated_at: '2024-06-01T00:00:00Z',
};

const mockBookNoCover: Book = {
  ...mockBook,
  id: '22222222-2222-2222-2222-222222222222',
  cover_url: null,
  thumbnail_url: null,
  enrichment_status: 'not_found',
};

const mockHighlight: Highlight = {
  id: '33333333-3333-3333-3333-333333333333',
  book_id: mockBook.id,
  import_id: '44444444-4444-4444-4444-444444444444',
  sequence_number: 1,
  text: 'So we beat on, boats against the current.',
  note_text: 'Famous closing line',
  raw_block: 'raw...',
  content_hash: 'def456',
  source_location: '2340',
  source_type: 'highlight',
  highlighted_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const mockCollection: Collection = {
  id: '55555555-5555-5555-5555-555555555555',
  name: 'American Classics',
  description: 'Essential American literature',
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-03-01T00:00:00Z',
};

// ---------------------------------------------------------------------------
// transformBook
// ---------------------------------------------------------------------------

describe('transformBook', () => {
  it('adds title and author aliases from canonical fields', () => {
    const result = transformBook(mockBook);
    expect(result.title).toBe('The Great Gatsby');
    expect(result.author).toBe('F. Scott Fitzgerald');
    // Original fields still present
    expect(result.canonical_title).toBe('The Great Gatsby');
    expect(result.canonical_author).toBe('F. Scott Fitzgerald');
  });

  it('includes cover object when cover_url is present', () => {
    const result = transformBook(mockBook);
    expect(result.cover).toEqual({
      cover_url: mockBook.cover_url,
      thumbnail_url: mockBook.thumbnail_url,
    });
  });

  it('returns null cover when no cover URLs exist', () => {
    const result = transformBook(mockBookNoCover);
    expect(result.cover).toBeNull();
  });

  it('includes source field', () => {
    const result = transformBook(mockBook);
    expect(result.source).toBe('kindle_export');
  });

  it('preserves all original Book fields', () => {
    const result = transformBook(mockBook);
    expect(result.id).toBe(mockBook.id);
    expect(result.highlight_count).toBe(42);
    expect(result.note_count).toBe(5);
    expect(result.enrichment_status).toBe('found');
  });
});

describe('transformBooks', () => {
  it('transforms an array of books', () => {
    const result = transformBooks([mockBook, mockBookNoCover]);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('The Great Gatsby');
    expect(result[1].cover).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// transformBookRef
// ---------------------------------------------------------------------------

describe('transformBookRef', () => {
  it('adds title/author aliases to book reference', () => {
    const ref = { id: mockBook.id, canonical_title: 'Gatsby', canonical_author: 'Fitzgerald' };
    const result = transformBookRef(ref);
    expect(result.title).toBe('Gatsby');
    expect(result.author).toBe('Fitzgerald');
    expect(result.canonical_title).toBe('Gatsby');
  });
});

// ---------------------------------------------------------------------------
// transformHighlight
// ---------------------------------------------------------------------------

describe('transformHighlight', () => {
  it('adds note alias from note_text', () => {
    const result = transformHighlight(mockHighlight);
    expect(result.note).toBe('Famous closing line');
    expect(result.note_text).toBe('Famous closing line');
  });

  it('parses location from source_location', () => {
    const result = transformHighlight(mockHighlight);
    expect(result.location).toBe(2340);
  });

  it('handles null source_location', () => {
    const hl = { ...mockHighlight, source_location: null };
    const result = transformHighlight(hl);
    expect(result.location).toBeNull();
  });

  it('includes book reference when provided', () => {
    const book = { id: mockBook.id, canonical_title: 'Gatsby', canonical_author: 'Fitz' };
    const result = transformHighlight(mockHighlight, book);
    expect(result.book).toBeDefined();
    expect(result.book!.title).toBe('Gatsby');
  });

  it('omits book key when no book provided', () => {
    const result = transformHighlight(mockHighlight);
    expect(result).not.toHaveProperty('book');
  });
});

// ---------------------------------------------------------------------------
// transformCollection
// ---------------------------------------------------------------------------

describe('transformCollection', () => {
  it('maps name→title and description→summary', () => {
    const result = transformCollection({ ...mockCollection, book_count: 3, books: [] });
    expect(result.title).toBe('American Classics');
    expect(result.summary).toBe('Essential American literature');
    // Originals still present
    expect(result.name).toBe('American Classics');
    expect(result.description).toBe('Essential American literature');
  });

  it('includes book_count, tags, highlight_count, note_count', () => {
    const result = transformCollection({ ...mockCollection, book_count: 7, books: [] });
    expect(result.book_count).toBe(7);
    expect(result.tags).toEqual([]);
    expect(result.highlight_count).toBe(0);
    expect(result.note_count).toBe(0);
  });

  it('computes contains_book when containsBookId provided', () => {
    const result = transformCollection(
      { ...mockCollection, books: [mockBook], book_count: 1 },
      mockBook.id,
    );
    expect(result.contains_book).toBe(true);

    const result2 = transformCollection(
      { ...mockCollection, books: [mockBook], book_count: 1 },
      'nonexistent-id',
    );
    expect(result2.contains_book).toBe(false);
  });

  it('generates preview_books from first 3 books', () => {
    const books = [mockBook, mockBookNoCover, mockBook];
    const result = transformCollection({ ...mockCollection, books, book_count: 3 });
    expect(result.preview_books).toHaveLength(3);
    expect(result.preview_books[0].title).toBe('The Great Gatsby');
  });
});

// ---------------------------------------------------------------------------
// transformSearchResult
// ---------------------------------------------------------------------------

describe('transformSearchResult', () => {
  it('wraps highlight and book with search metadata', () => {
    const sr: SearchResult = {
      highlight: mockHighlight,
      book: { id: mockBook.id, canonical_title: 'Gatsby', canonical_author: 'Fitz' },
    };
    const result = transformSearchResult(sr, 'boats current');
    expect(result.highlight.text).toBe(mockHighlight.text);
    expect(result.book.title).toBe('Gatsby');
    expect(result.matched_terms).toEqual(['boats', 'current']);
    expect(result.matched_in_note).toBe(false);
    expect(result.matched_field).toBe('text');
  });

  it('detects matched_in_note when query matches note text', () => {
    const sr: SearchResult = {
      highlight: mockHighlight,
      book: { id: mockBook.id, canonical_title: 'Gatsby', canonical_author: 'Fitz' },
    };
    const result = transformSearchResult(sr, 'famous closing');
    expect(result.matched_in_note).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildPagination
// ---------------------------------------------------------------------------

describe('buildPagination', () => {
  it('computes page 1 for offset 0', () => {
    const p = buildPagination(100, 20, 0);
    expect(p.page).toBe(1);
    expect(p.limit).toBe(20);
    expect(p.total).toBe(100);
    expect(p.has_more).toBe(true);
    expect(p.next_page).toBe(2);
  });

  it('computes last page correctly', () => {
    const p = buildPagination(100, 20, 80);
    expect(p.page).toBe(5);
    expect(p.has_more).toBe(false);
    expect(p.next_page).toBeNull();
  });

  it('handles total=0', () => {
    const p = buildPagination(0, 20, 0);
    expect(p.page).toBe(1);
    expect(p.total).toBe(0);
    expect(p.has_more).toBe(false);
    expect(p.next_page).toBeNull();
  });

  it('handles exact page boundary', () => {
    const p = buildPagination(40, 20, 20);
    expect(p.page).toBe(2);
    expect(p.has_more).toBe(false);
    expect(p.next_page).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// pageToOffset
// ---------------------------------------------------------------------------

describe('pageToOffset', () => {
  it('converts page 1 to offset 0', () => {
    expect(pageToOffset(1, 20)).toBe(0);
  });

  it('converts page 3 limit 50 to offset 100', () => {
    expect(pageToOffset(3, 50)).toBe(100);
  });

  it('treats null/0 as page 1', () => {
    expect(pageToOffset(null, 20)).toBe(0);
    expect(pageToOffset(0, 20)).toBe(0);
  });
});
