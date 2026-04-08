import type { ParseResult } from '@/lib/types';
import { parseKindleExport } from './kindle';
import { parseKindleNotebook } from './kindle-notebook';
export { contentHash, bookContentHash } from './kindle';

export type KindleFormat = 'clippings' | 'notebook';

/**
 * Detect the format of a Kindle highlights file.
 *
 * - "clippings" = My Clippings.txt with ========== separators
 * - "notebook" = Kindle notebook export with double-blank-line separators
 */
export function detectFormat(text: string): KindleFormat {
  // The My Clippings.txt format always has ========== separator lines
  const separatorCount = (text.match(/={10}/g) || []).length;
  if (separatorCount >= 2) return 'clippings';
  return 'notebook';
}

/**
 * Parse a Kindle highlights file, auto-detecting the format.
 */
export function parseKindle(text: string): ParseResult & { format: KindleFormat } {
  const format = detectFormat(text);
  const result = format === 'clippings'
    ? parseKindleExport(text)
    : parseKindleNotebook(text);

  return { ...result, format };
}

/**
 * Parse in preview mode — returns stats without persisting anything.
 */
export function previewKindle(text: string): PreviewResult {
  const { books, warnings, format } = parseKindle(text);

  let highlightsDetected = 0;
  let notesDetected = 0;
  let vocabDetected = 0;

  const bookPreviews: BookPreview[] = [];

  for (const book of books) {
    let bookHighlights = 0;
    let bookNotes = 0;
    let bookVocab = 0;

    for (const h of book.highlights) {
      if (h.type === 'vocabulary') {
        vocabDetected++;
        bookVocab++;
      } else if (h.type === 'note') {
        notesDetected++;
        bookNotes++;
      } else {
        highlightsDetected++;
        bookHighlights++;
      }
      // Count attached notes
      if (h.note) {
        notesDetected++;
        bookNotes++;
      }
    }

    bookPreviews.push({
      title: book.title,
      author: book.author,
      highlight_count: bookHighlights,
      note_count: bookNotes,
      vocab_count: bookVocab,
    });
  }

  return {
    format,
    books_detected: books.length,
    highlights_detected: highlightsDetected,
    notes_detected: notesDetected,
    vocab_detected: vocabDetected,
    parse_warnings_count: warnings.length,
    warnings,
    books: bookPreviews,
  };
}

export interface BookPreview {
  title: string;
  author: string | null;
  highlight_count: number;
  note_count: number;
  vocab_count: number;
}

export interface PreviewResult {
  format: KindleFormat;
  books_detected: number;
  highlights_detected: number;
  notes_detected: number;
  vocab_detected: number;
  parse_warnings_count: number;
  warnings: string[];
  books: BookPreview[];
}
