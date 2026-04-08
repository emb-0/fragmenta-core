// =============================================================================
// Database row types
// =============================================================================

export interface Import {
  id: string;
  source_type: 'kindle_txt' | 'kindle_notebook';
  filename: string | null;
  raw_text: string;
  parse_status: 'pending' | 'processing' | 'completed' | 'failed';
  import_summary: ImportSummary;
  error_message: string | null;
  created_at: string;
}

export interface ImportSummary {
  format: string;
  books_found: number;
  books_created: number;
  books_existing: number;
  highlights_found: number;
  highlights_created: number;
  highlights_skipped_duplicate: number;
  notes_found: number;
  vocab_found: number;
  warnings: string[];
}

export interface Book {
  id: string;
  canonical_title: string;
  canonical_author: string | null;
  source_title_raw: string;
  source_author_raw: string | null;
  content_hash: string;
  highlight_count: number;
  note_count: number;
  first_imported_at: string;
  last_imported_at: string;
  created_at: string;
  updated_at: string;
}

export interface Highlight {
  id: string;
  book_id: string;
  import_id: string;
  sequence_number: number;
  text: string;
  note_text: string | null;
  raw_block: string;
  content_hash: string;
  source_location: string | null;
  source_type: string | null;
  highlighted_at: string | null;
  created_at: string;
  updated_at: string;
}

// =============================================================================
// Parser types
// =============================================================================

export interface ParsedBook {
  title: string;
  author: string | null;
  highlights: ParsedHighlight[];
}

export interface ParsedHighlight {
  text: string;
  note: string | null;
  location: string | null;
  type: string | null;
  date: string | null;
  rawBlock: string;
}

export interface ParseResult {
  books: ParsedBook[];
  warnings: string[];
}

// =============================================================================
// API response types
// =============================================================================

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: {
    message: string;
    code: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export interface SearchResult {
  highlight: Highlight;
  book: Pick<Book, 'id' | 'canonical_title' | 'canonical_author'>;
}
