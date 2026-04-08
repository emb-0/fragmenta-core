import { createServerClient } from './client';
import type { Book, Highlight, Import, ImportSummary, SearchResult } from '@/lib/types';
import type { ParseResult } from '@/lib/types';
import type { KindleFormat } from '@/lib/parser';
import { contentHash, bookContentHash } from '@/lib/parser';
import { canonicalizeTitle, canonicalizeAuthor } from '@/lib/parser/canonicalize';

// =============================================================================
// Imports
// =============================================================================

export async function createImport(
  rawText: string,
  sourceType: 'kindle_txt' | 'kindle_notebook',
  filename?: string,
): Promise<Import> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('imports')
    .insert({
      source_type: sourceType,
      raw_text: rawText,
      filename: filename || null,
      parse_status: 'pending',
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create import: ${error.message}`);
  return data as Import;
}

export async function updateImportStatus(
  importId: string,
  status: Import['parse_status'],
  summary?: ImportSummary,
  errorMessage?: string,
): Promise<void> {
  const supabase = createServerClient();
  const update: Record<string, unknown> = { parse_status: status };
  if (summary !== undefined) update.import_summary = summary;
  if (errorMessage !== undefined) update.error_message = errorMessage;

  const { error } = await supabase
    .from('imports')
    .update(update)
    .eq('id', importId);

  if (error) throw new Error(`Failed to update import: ${error.message}`);
}

export async function listImports(): Promise<Import[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('imports')
    .select('id, source_type, filename, parse_status, import_summary, error_message, created_at')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to list imports: ${error.message}`);
  return data as Import[];
}

export async function getImport(id: string): Promise<Import | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('imports')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get import: ${error.message}`);
  }
  return data as Import;
}

// =============================================================================
// Ingest pipeline
// =============================================================================

export async function ingestParseResult(
  importId: string,
  parseResult: ParseResult,
  format: KindleFormat,
): Promise<ImportSummary> {
  const supabase = createServerClient();

  const summary: ImportSummary = {
    format,
    books_found: parseResult.books.length,
    books_created: 0,
    books_existing: 0,
    highlights_found: 0,
    highlights_created: 0,
    highlights_skipped_duplicate: 0,
    notes_found: 0,
    vocab_found: 0,
    warnings: [...parseResult.warnings],
  };

  // Dedupe within the import: track content hashes per book
  const seenInImport = new Map<string, Set<string>>();

  for (const parsedBook of parseResult.books) {
    summary.highlights_found += parsedBook.highlights.length;

    // Count notes and vocab
    for (const h of parsedBook.highlights) {
      if (h.note) summary.notes_found++;
      if (h.type === 'vocabulary') summary.vocab_found++;
      if (h.type === 'note') summary.notes_found++;
    }

    const title = canonicalizeTitle(parsedBook.title);
    const author = canonicalizeAuthor(parsedBook.author);
    const hash = bookContentHash(title, author);

    // Upsert book
    const { data: existingBook } = await supabase
      .from('books')
      .select()
      .eq('content_hash', hash)
      .single();

    let bookId: string;

    if (existingBook) {
      bookId = existingBook.id;
      summary.books_existing++;
      await supabase
        .from('books')
        .update({ last_imported_at: new Date().toISOString() })
        .eq('id', bookId);
    } else {
      const { data: newBook, error } = await supabase
        .from('books')
        .insert({
          canonical_title: title,
          canonical_author: author,
          source_title_raw: parsedBook.title,
          source_author_raw: parsedBook.author,
          content_hash: hash,
        })
        .select()
        .single();

      if (error) throw new Error(`Failed to insert book "${title}": ${error.message}`);
      bookId = newBook.id;
      summary.books_created++;
    }

    // Track within-import dedup
    if (!seenInImport.has(bookId)) {
      seenInImport.set(bookId, new Set());
    }
    const bookSeen = seenInImport.get(bookId)!;

    // Insert highlights, skipping duplicates
    for (let i = 0; i < parsedBook.highlights.length; i++) {
      const h = parsedBook.highlights[i];
      const hHash = contentHash(h.text);

      // Within-import dedup
      if (bookSeen.has(hHash)) {
        summary.highlights_skipped_duplicate++;
        summary.warnings.push(`Duplicate within import: "${h.text.substring(0, 60)}..." in "${title}"`);
        continue;
      }
      bookSeen.add(hHash);

      const { error } = await supabase
        .from('highlights')
        .insert({
          book_id: bookId,
          import_id: importId,
          sequence_number: i + 1,
          text: h.text,
          note_text: h.note,
          raw_block: h.rawBlock,
          content_hash: hHash,
          source_location: h.location,
          source_type: h.type,
          highlighted_at: h.date ? tryParseDate(h.date) : null,
        });

      if (error) {
        if (error.code === '23505') {
          summary.highlights_skipped_duplicate++;
        } else {
          summary.warnings.push(`Failed to insert highlight ${i + 1} for "${title}": ${error.message}`);
        }
      } else {
        summary.highlights_created++;
      }
    }
  }

  return summary;
}

function tryParseDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

// =============================================================================
// Books
// =============================================================================

export type BookSortField = 'recent' | 'title' | 'author' | 'highlights';

export async function listBooks(options?: {
  sort?: BookSortField;
  hasNotes?: boolean;
}): Promise<Book[]> {
  const supabase = createServerClient();
  let query = supabase.from('books').select('*');

  if (options?.hasNotes) {
    query = query.gt('note_count', 0);
  }

  switch (options?.sort) {
    case 'title':
      query = query.order('canonical_title', { ascending: true });
      break;
    case 'author':
      query = query.order('canonical_author', { ascending: true, nullsFirst: false });
      break;
    case 'highlights':
      query = query.order('highlight_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('last_imported_at', { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list books: ${error.message}`);
  return data as Book[];
}

export async function getBook(id: string): Promise<Book | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get book: ${error.message}`);
  }
  return data as Book;
}

export async function mergeBooks(keepId: string, mergeId: string): Promise<void> {
  const supabase = createServerClient();

  // Move all highlights from mergeId to keepId
  const { error: moveError } = await supabase
    .from('highlights')
    .update({ book_id: keepId })
    .eq('book_id', mergeId);

  if (moveError) throw new Error(`Failed to move highlights: ${moveError.message}`);

  // Recount highlights
  const { count: hlCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', keepId);

  const { count: noteCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', keepId)
    .not('note_text', 'is', null);

  await supabase
    .from('books')
    .update({
      highlight_count: hlCount || 0,
      note_count: noteCount || 0,
    })
    .eq('id', keepId);

  // Delete the merged book
  const { error: deleteError } = await supabase
    .from('books')
    .delete()
    .eq('id', mergeId);

  if (deleteError) throw new Error(`Failed to delete merged book: ${deleteError.message}`);
}

// =============================================================================
// Book editing
// =============================================================================

export async function updateBook(
  id: string,
  updates: { canonical_title?: string; canonical_author?: string | null },
): Promise<Book> {
  const supabase = createServerClient();

  const patch: Record<string, unknown> = {};
  if (updates.canonical_title !== undefined) patch.canonical_title = updates.canonical_title.trim();
  if (updates.canonical_author !== undefined) patch.canonical_author = updates.canonical_author?.trim() || null;

  if (Object.keys(patch).length === 0) {
    const book = await getBook(id);
    if (!book) throw new Error('Book not found');
    return book;
  }

  // Recompute content hash if title or author changed
  const existing = await getBook(id);
  if (!existing) throw new Error('Book not found');

  const newTitle = (patch.canonical_title as string) ?? existing.canonical_title;
  const newAuthor = (patch.canonical_author as string | null) ?? existing.canonical_author;
  patch.content_hash = bookContentHash(newTitle, newAuthor);

  const { data, error } = await supabase
    .from('books')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update book: ${error.message}`);
  return data as Book;
}

export async function deleteBook(id: string): Promise<{ deletedHighlights: number }> {
  const supabase = createServerClient();

  // Count highlights first
  const { count } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', id);

  // Delete highlights
  const { error: hlError } = await supabase
    .from('highlights')
    .delete()
    .eq('book_id', id);
  if (hlError) throw new Error(`Failed to delete highlights: ${hlError.message}`);

  // Delete book
  const { error: bookError } = await supabase
    .from('books')
    .delete()
    .eq('id', id);
  if (bookError) throw new Error(`Failed to delete book: ${bookError.message}`);

  return { deletedHighlights: count || 0 };
}

// =============================================================================
// Highlight editing
// =============================================================================

export async function updateHighlight(
  id: string,
  updates: { text?: string; note_text?: string | null },
): Promise<Highlight> {
  const supabase = createServerClient();

  const patch: Record<string, unknown> = {};
  if (updates.text !== undefined) {
    const trimmed = updates.text.trim();
    if (!trimmed) throw new Error('Highlight text cannot be empty');
    patch.text = trimmed;
    patch.content_hash = contentHash(trimmed);
  }
  if (updates.note_text !== undefined) {
    patch.note_text = updates.note_text?.trim() || null;
  }

  if (Object.keys(patch).length === 0) {
    const hl = await getHighlight(id);
    if (!hl) throw new Error('Highlight not found');
    return hl;
  }

  const { data, error } = await supabase
    .from('highlights')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new Error('A highlight with this text already exists for this book');
    throw new Error(`Failed to update highlight: ${error.message}`);
  }

  // If note was added or removed, update book note_count
  if (updates.note_text !== undefined) {
    const bookId = (data as Record<string, unknown>).book_id as string;
    const { count: noteCount } = await supabase
      .from('highlights')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', bookId)
      .not('note_text', 'is', null);

    await supabase
      .from('books')
      .update({ note_count: noteCount || 0 })
      .eq('id', bookId);
  }

  return data as Highlight;
}

export async function deleteHighlight(id: string): Promise<{ bookId: string }> {
  const supabase = createServerClient();

  // Get the highlight first to know its book
  const { data: existing } = await supabase
    .from('highlights')
    .select('book_id, note_text')
    .eq('id', id)
    .single();

  if (!existing) throw new Error('Highlight not found');
  const bookId = existing.book_id as string;

  const { error } = await supabase
    .from('highlights')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Failed to delete highlight: ${error.message}`);

  // Update book counts
  const { count: hlCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId);

  const { count: noteCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId)
    .not('note_text', 'is', null);

  await supabase
    .from('books')
    .update({
      highlight_count: hlCount || 0,
      note_count: noteCount || 0,
    })
    .eq('id', bookId);

  return { bookId };
}

// =============================================================================
// Highlights
// =============================================================================

export async function getHighlight(id: string): Promise<(Highlight & { book: Pick<Book, 'id' | 'canonical_title' | 'canonical_author'> }) | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('highlights')
    .select('*, books!inner(id, canonical_title, canonical_author)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get highlight: ${error.message}`);
  }

  const row = data as Record<string, unknown>;
  const books = row.books as Record<string, unknown>;
  return {
    ...extractHighlight(row),
    book: {
      id: books.id as string,
      canonical_title: books.canonical_title as string,
      canonical_author: books.canonical_author as string | null,
    },
  };
}

export async function getHighlightsForBook(
  bookId: string,
  options?: {
    limit?: number;
    offset?: number;
    sort?: 'sequence' | 'recent';
    hasNotes?: boolean;
  },
): Promise<{ highlights: Highlight[]; total: number }> {
  const supabase = createServerClient();
  const limit = options?.limit || 100;
  const offset = options?.offset || 0;

  let countQuery = supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', bookId);

  let dataQuery = supabase
    .from('highlights')
    .select('*')
    .eq('book_id', bookId);

  if (options?.hasNotes) {
    countQuery = countQuery.not('note_text', 'is', null);
    dataQuery = dataQuery.not('note_text', 'is', null);
  }

  if (options?.sort === 'recent') {
    dataQuery = dataQuery.order('created_at', { ascending: false });
  } else {
    dataQuery = dataQuery.order('sequence_number', { ascending: true });
  }

  const { count } = await countQuery;
  const { data, error } = await dataQuery.range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to get highlights: ${error.message}`);
  return { highlights: data as Highlight[], total: count || 0 };
}

// =============================================================================
// Search
// =============================================================================

export interface SearchOptions {
  limit?: number;
  offset?: number;
  bookId?: string;
  hasNotes?: boolean;
  sort?: 'relevance' | 'recent' | 'book';
}

export async function searchHighlights(
  query: string,
  options?: SearchOptions,
): Promise<{ results: SearchResult[]; total: number }> {
  const supabase = createServerClient();
  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  // Build tsquery: prefix match on each word
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((w) => w + ':*')
    .join(' & ');

  if (!tsQuery) {
    return { results: [], total: 0 };
  }

  // Search across highlight text AND note text using the combined index
  // We use an OR to match either text or note_text
  let countQuery = supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .or(`text.fts.${tsQuery},note_text.fts.${tsQuery}`);

  let dataQuery = supabase
    .from('highlights')
    .select('*, books!inner(id, canonical_title, canonical_author)')
    .or(`text.fts.${tsQuery},note_text.fts.${tsQuery}`);

  if (options?.bookId) {
    countQuery = countQuery.eq('book_id', options.bookId);
    dataQuery = dataQuery.eq('book_id', options.bookId);
  }

  if (options?.hasNotes) {
    countQuery = countQuery.not('note_text', 'is', null);
    dataQuery = dataQuery.not('note_text', 'is', null);
  }

  // Sort
  switch (options?.sort) {
    case 'book':
      dataQuery = dataQuery.order('book_id').order('sequence_number', { ascending: true });
      break;
    case 'recent':
      dataQuery = dataQuery.order('created_at', { ascending: false });
      break;
    default: // relevance — Postgres FTS doesn't have a built-in rank via Supabase client, use recent as proxy
      dataQuery = dataQuery.order('created_at', { ascending: false });
      break;
  }

  const { count } = await countQuery;
  const { data: highlights, error } = await dataQuery.range(offset, offset + limit - 1);

  if (error) throw new Error(`Failed to search highlights: ${error.message}`);

  const results: SearchResult[] = (highlights || []).map((row: Record<string, unknown>) => {
    const books = row.books as Record<string, unknown>;
    return {
      highlight: extractHighlight(row),
      book: {
        id: books.id as string,
        canonical_title: books.canonical_title as string,
        canonical_author: books.canonical_author as string | null,
      },
    };
  });

  return { results, total: count || 0 };
}

// Also search books by title/author
export async function searchBooks(
  query: string,
): Promise<Book[]> {
  const supabase = createServerClient();
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean)
    .map((w) => w + ':*')
    .join(' & ');

  if (!tsQuery) return [];

  const { data, error } = await supabase
    .from('books')
    .select('*')
    .or(`canonical_title.fts.${tsQuery},canonical_author.fts.${tsQuery}`)
    .order('highlight_count', { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to search books: ${error.message}`);
  return data as Book[];
}

// =============================================================================
// Exports
// =============================================================================

export async function exportAllHighlights(options?: {
  bookId?: string;
}): Promise<{ books: Array<Book & { highlights: Highlight[] }> }> {
  const supabase = createServerClient();

  let booksQuery = supabase.from('books').select('*').order('canonical_title');
  if (options?.bookId) {
    booksQuery = booksQuery.eq('id', options.bookId);
  }

  const { data: books, error: booksError } = await booksQuery;
  if (booksError) throw new Error(`Failed to fetch books: ${booksError.message}`);

  const result: Array<Book & { highlights: Highlight[] }> = [];

  for (const book of books || []) {
    const { data: highlights, error: hlError } = await supabase
      .from('highlights')
      .select('*')
      .eq('book_id', book.id)
      .order('sequence_number', { ascending: true });

    if (hlError) throw new Error(`Failed to fetch highlights: ${hlError.message}`);
    result.push({ ...book, highlights: highlights as Highlight[] });
  }

  return { books: result as Array<Book & { highlights: Highlight[] }> };
}

// =============================================================================
// Random highlight
// =============================================================================

export async function getRandomHighlight(): Promise<(Highlight & { book: Pick<Book, 'id' | 'canonical_title' | 'canonical_author'> }) | null> {
  const supabase = createServerClient();

  // Get total count
  const { count } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true });

  if (!count || count === 0) return null;

  const randomOffset = Math.floor(Math.random() * count);

  const { data, error } = await supabase
    .from('highlights')
    .select('*, books!inner(id, canonical_title, canonical_author)')
    .range(randomOffset, randomOffset)
    .single();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  const books = row.books as Record<string, unknown>;
  return {
    ...extractHighlight(row),
    book: {
      id: books.id as string,
      canonical_title: books.canonical_title as string,
      canonical_author: books.canonical_author as string | null,
    },
  };
}

// =============================================================================
// Enrichment
// =============================================================================

import { searchGoogleBooks } from '@/lib/google-books';

export async function enrichBook(bookId: string): Promise<Book> {
  const supabase = createServerClient();

  const book = await getBook(bookId);
  if (!book) throw new Error('Book not found');

  // Skip if already enriched with a definitive result
  if (book.enrichment_status === 'found' || book.enrichment_status === 'not_found') {
    return book;
  }

  const result = await searchGoogleBooks(book.canonical_title, book.canonical_author);

  if (!result) {
    // No match or API unavailable
    const { data, error } = await supabase
      .from('books')
      .update({
        enrichment_status: 'not_found',
        enrichment_updated_at: new Date().toISOString(),
      })
      .eq('id', bookId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update enrichment: ${error.message}`);
    return data as Book;
  }

  // Store enrichment
  const { data, error } = await supabase
    .from('books')
    .update({
      google_books_id: result.googleBooksId,
      cover_url: result.coverUrl,
      thumbnail_url: result.thumbnailUrl,
      subtitle: result.subtitle,
      publisher: result.publisher,
      published_date: result.publishedDate,
      page_count: result.pageCount,
      google_books_link: result.infoLink,
      enrichment_status: 'found',
      enrichment_confidence: result.confidence,
      enrichment_updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .select()
    .single();

  if (error) throw new Error(`Failed to store enrichment: ${error.message}`);
  return data as Book;
}

export async function enrichBooksBackfill(options?: {
  limit?: number;
  force?: boolean;
}): Promise<{ enriched: number; notFound: number; errors: number; skipped: number; total: number }> {
  const supabase = createServerClient();
  const limit = options?.limit || 50;

  // Get books that need enrichment
  let query = supabase
    .from('books')
    .select('id, canonical_title, canonical_author, enrichment_status')
    .order('highlight_count', { ascending: false })
    .limit(limit);

  if (!options?.force) {
    query = query.or('enrichment_status.eq.pending,enrichment_status.is.null');
  }

  const { data: books, error } = await query;
  if (error) throw new Error(`Failed to fetch books for enrichment: ${error.message}`);

  const stats = { enriched: 0, notFound: 0, errors: 0, skipped: 0, total: books?.length || 0 };

  for (const book of books || []) {
    try {
      // Throttle: 300ms between API calls
      if (stats.enriched + stats.notFound > 0) {
        await new Promise((r) => setTimeout(r, 300));
      }

      const result = await enrichBook(book.id);
      if (result.enrichment_status === 'found') {
        stats.enriched++;
      } else if (result.enrichment_status === 'not_found') {
        stats.notFound++;
      } else {
        stats.skipped++;
      }
    } catch (err) {
      console.error(`Failed to enrich book ${book.id}:`, err);
      stats.errors++;

      // Mark as error
      await supabase
        .from('books')
        .update({
          enrichment_status: 'error',
          enrichment_updated_at: new Date().toISOString(),
        })
        .eq('id', book.id);
    }
  }

  return stats;
}

/** Optimized bookshelf query — only fields needed for cover grid */
export async function listBooksForShelf(options?: {
  sort?: BookSortField;
  hasCovers?: boolean;
}): Promise<Book[]> {
  const supabase = createServerClient();
  let query = supabase
    .from('books')
    .select('id, canonical_title, canonical_author, highlight_count, note_count, cover_url, thumbnail_url, enrichment_status, enrichment_confidence, created_at, updated_at, first_imported_at, last_imported_at, content_hash, source_title_raw, source_author_raw, google_books_id, subtitle, publisher, published_date, page_count, google_books_link, enrichment_updated_at');

  if (options?.hasCovers) {
    query = query.not('cover_url', 'is', null);
  }

  switch (options?.sort) {
    case 'title':
      query = query.order('canonical_title', { ascending: true });
      break;
    case 'author':
      query = query.order('canonical_author', { ascending: true, nullsFirst: false });
      break;
    case 'highlights':
      query = query.order('highlight_count', { ascending: false });
      break;
    case 'recent':
    default:
      query = query.order('last_imported_at', { ascending: false });
      break;
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list books for shelf: ${error.message}`);
  return data as Book[];
}

// =============================================================================
// Stats
// =============================================================================

export async function getLibraryStats(): Promise<{
  bookCount: number;
  highlightCount: number;
  noteCount: number;
}> {
  const supabase = createServerClient();

  const { count: bookCount } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true });

  const { count: highlightCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true });

  const { count: noteCount } = await supabase
    .from('highlights')
    .select('*', { count: 'exact', head: true })
    .not('note_text', 'is', null);

  return {
    bookCount: bookCount || 0,
    highlightCount: highlightCount || 0,
    noteCount: noteCount || 0,
  };
}

// =============================================================================
// Helpers
// =============================================================================

function extractHighlight(row: Record<string, unknown>): Highlight {
  return {
    id: row.id,
    book_id: row.book_id,
    import_id: row.import_id,
    sequence_number: row.sequence_number,
    text: row.text,
    note_text: row.note_text,
    raw_block: row.raw_block,
    content_hash: row.content_hash,
    source_location: row.source_location,
    source_type: row.source_type,
    highlighted_at: row.highlighted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  } as Highlight;
}
