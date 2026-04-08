/**
 * iOS compatibility helpers.
 *
 * fragmenta-ios expects specific response shapes that differ from the
 * original web-centric API. These helpers transform database rows into
 * the shapes the iOS Codable models can decode.
 *
 * Design: additive — we include BOTH the original fields and the iOS-expected
 * aliases so neither the web UI nor the iOS app breaks.
 */

import type { Book, Highlight, Collection, SearchResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
  next_page: number | null;
}

export function buildPagination(
  total: number,
  limit: number,
  offset: number,
): PaginationMeta {
  const page = Math.floor(offset / limit) + 1;
  const has_more = offset + limit < total;
  return {
    page,
    limit,
    total,
    has_more,
    next_page: has_more ? page + 1 : null,
  };
}

/** Convert iOS page-based params to offset-based */
export function pageToOffset(page: number | null, limit: number): number {
  const p = Math.max(1, page || 1);
  return (p - 1) * limit;
}

// ---------------------------------------------------------------------------
// Book transform
// ---------------------------------------------------------------------------

/**
 * iOS Book model expects:
 *   title, author, highlight_count, note_count,
 *   cover: { thumbnail_url, cover_url },
 *   source, synopsis, last_imported_at, created_at, updated_at
 *
 * We include the original fields AND the aliases.
 */
export function transformBook(book: Book) {
  return {
    // Original fields (kept for backward compat)
    ...book,
    // iOS aliases
    title: book.canonical_title,
    author: book.canonical_author,
    source: 'kindle_export',
    cover: book.cover_url || book.thumbnail_url
      ? {
          cover_url: book.cover_url,
          thumbnail_url: book.thumbnail_url,
        }
      : null,
    synopsis: null,
  };
}

export function transformBooks(books: Book[]) {
  return books.map(transformBook);
}

// ---------------------------------------------------------------------------
// Book reference transform (for nested references in highlights/search)
// ---------------------------------------------------------------------------

export function transformBookRef(book: Pick<Book, 'id' | 'canonical_title' | 'canonical_author'>) {
  return {
    ...book,
    title: book.canonical_title,
    author: book.canonical_author,
  };
}

// ---------------------------------------------------------------------------
// Highlight transform
// ---------------------------------------------------------------------------

/**
 * iOS Highlight model expects:
 *   id, book_id (as bookID after camelCase), text, note (not note_text),
 *   location, page, chapter, highlighted_at, created_at, updated_at, book?
 */
export function transformHighlight(
  hl: Highlight,
  book?: Pick<Book, 'id' | 'canonical_title' | 'canonical_author'>,
) {
  return {
    ...hl,
    // iOS aliases
    note: hl.note_text,
    location: hl.source_location ? parseInt(hl.source_location, 10) || null : null,
    page: null,
    chapter: null,
    color_name: null,
    ...(book ? { book: transformBookRef(book) } : {}),
  };
}

// ---------------------------------------------------------------------------
// Collection transform
// ---------------------------------------------------------------------------

/**
 * iOS Collection model expects:
 *   title, summary, tags, book_count, highlight_count, note_count,
 *   contains_book, preview_books
 */
export function transformCollection(
  collection: Collection & { book_count?: number; books?: Book[] },
  containsBookId?: string,
) {
  const bookCount = collection.book_count ?? collection.books?.length ?? 0;
  return {
    ...collection,
    // iOS aliases
    title: collection.name,
    summary: collection.description,
    tags: [],
    book_count: bookCount,
    highlight_count: 0,
    note_count: 0,
    contains_book: containsBookId
      ? (collection.books || []).some((b) => b.id === containsBookId)
      : null,
    preview_books: collection.books
      ? transformBooks(collection.books.slice(0, 3))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Search result transform
// ---------------------------------------------------------------------------

/**
 * iOS HighlightSearchResult expects:
 *   highlight, book, matched_terms, snippet, matched_in_note,
 *   matched_field, match_reason, semantic_score
 */
export function transformSearchResult(
  result: SearchResult,
  query: string,
) {
  return {
    highlight: transformHighlight(result.highlight),
    book: transformBookRef(result.book),
    matched_terms: query.trim().split(/\s+/).filter(Boolean),
    snippet: null,
    matched_in_note: result.highlight.note_text
      ? result.highlight.note_text.toLowerCase().includes(query.toLowerCase())
      : false,
    matched_field: 'text',
    match_reason: null,
    semantic_score: null,
  };
}
