import type { ParsedBook, ParsedHighlight, ParseResult } from '@/lib/types';

/**
 * Parser for the Kindle notebook/highlights web export format.
 * This format uses double-blank-line separators, comma-separated "Title, Author"
 * headers, and has no location/date metadata.
 */

export function parseKindleNotebook(text: string): ParseResult {
  const warnings: string[] = [];

  // Normalize line endings and remove BOM
  const clean = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    .replace(/&#39;/g, "'");

  // Split into blocks separated by 2+ blank lines
  const blocks = clean
    .split(/\n\s*\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  if (blocks.length === 0) {
    warnings.push('No content blocks found in the input text.');
    return { books: [], warnings };
  }

  const result: ParsedBook[] = [];
  let currentBook: ParsedBook | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Skip empty blocks
    if (!block) continue;

    // Check if this block is a book title line
    if (isBookTitleBlock(block)) {
      const titleParse = tryParseBookTitle(block);
      if (titleParse) {
        // Start a new book
        if (currentBook && currentBook.highlights.length > 0) {
          result.push(currentBook);
        }
        currentBook = {
          title: titleParse.title,
          author: titleParse.author,
          highlights: [],
        };
        continue;
      }
    }

    // If no book context yet, the first block must be a book title
    if (!currentBook) {
      const forcedParse = tryParseBookTitle(block);
      if (forcedParse) {
        currentBook = {
          title: forcedParse.title,
          author: forcedParse.author,
          highlights: [],
        };
        continue;
      }
      warnings.push(`Block ${i + 1}: No book context, skipping: "${block.substring(0, 60)}..."`);
      continue;
    }

    // Check for vocabulary lookup (single word, no spaces, short)
    if (isVocabLookup(block)) {
      currentBook.highlights.push({
        text: block,
        note: null,
        location: null,
        type: 'vocabulary',
        date: null,
        rawBlock: block,
      });
      continue;
    }

    // Check for notes (prefixed with "Notes:" or "Note:")
    if (/^Notes?:\s/i.test(block)) {
      const noteText = block.replace(/^Notes?:\s*/i, '').trim();
      // Try to attach to the previous highlight
      const prevHighlight = currentBook.highlights[currentBook.highlights.length - 1];
      if (prevHighlight && !prevHighlight.note) {
        prevHighlight.note = noteText;
        prevHighlight.rawBlock += '\n\n' + block;
      } else {
        currentBook.highlights.push({
          text: noteText,
          note: null,
          location: null,
          type: 'note',
          date: null,
          rawBlock: block,
        });
        warnings.push(`Block ${i + 1}: Note with no attachable highlight, stored standalone.`);
      }
      continue;
    }

    // Check if the block contains an inline "Notes:" section (separated by single blank line)
    const noteInlineMatch = block.match(/\n\s*\n\s*Notes?:\s*/i);
    if (noteInlineMatch && noteInlineMatch.index !== undefined) {
      const highlightText = block.substring(0, noteInlineMatch.index).trim();
      const noteText = block.substring(noteInlineMatch.index).replace(/^\s*\n\s*\n\s*Notes?:\s*/i, '').trim();

      if (highlightText) {
        currentBook.highlights.push({
          text: highlightText,
          note: noteText || null,
          location: null,
          type: 'highlight',
          date: null,
          rawBlock: block,
        });
        continue;
      }
    }

    // Regular highlight
    currentBook.highlights.push({
      text: block,
      note: null,
      location: null,
      type: 'highlight',
      date: null,
      rawBlock: block,
    });
  }

  // Push the last book
  if (currentBook && currentBook.highlights.length > 0) {
    result.push(currentBook);
  }

  if (result.length === 0 && blocks.length > 0) {
    warnings.push('Blocks found but no books with highlights could be extracted.');
  }

  return { books: result, warnings };
}

/**
 * Determine if a block is a book title vs a highlight.
 * Book titles in Kindle notebook exports have distinctive characteristics:
 * - Single line (no line breaks in the block)
 * - Contains "Title, Author" pattern
 * - Doesn't start with a quotation mark (highlights often do)
 * - Doesn't end with sentence punctuation like . or ?
 * - Relatively short compared to highlight paragraphs
 */
function isBookTitleBlock(block: string): boolean {
  const trimmed = block.trim();

  // Must be single line
  if (trimmed.includes('\n')) return false;

  // Too long — highlight passages can be long, titles typically aren't
  if (trimmed.length > 180) return false;

  // Starts with lowercase — unlikely to be a title
  if (/^[a-z]/.test(trimmed)) return false;

  // Starts with a quotation mark — it's a quote/highlight
  if (/^[""\u201c\u201d']/.test(trimmed)) return false;

  // Ends with common sentence terminators — more likely a highlight
  // (but allow titles ending with ) for edition info, or year digits)
  if (/[.!?]$/.test(trimmed) && !/[)]$/.test(trimmed) && !/\d$/.test(trimmed)) return false;

  // Must have a comma (title-author separator)
  if (!trimmed.includes(',')) return false;

  // Try to parse as title/author
  const parsed = tryParseBookTitle(trimmed);
  if (!parsed) return false;

  // The author part should be a strong name match
  if (!parsed.author || !isStrongAuthorMatch(parsed.author)) return false;

  return true;
}

/**
 * Try to parse a line as "Book Title, Author Name".
 * Uses the last comma that produces a valid-looking author name.
 */
function tryParseBookTitle(line: string): { title: string; author: string | null } | null {
  const trimmed = line.trim();

  // Must be a single line
  if (trimmed.includes('\n')) return null;

  if (trimmed.length < 5 || trimmed.length > 300) return null;

  // Find all comma positions
  const commas: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === ',') commas.push(i);
  }

  if (commas.length === 0) return null;

  // Try commas from right to left, looking for author-like text after the comma
  for (let ci = commas.length - 1; ci >= 0; ci--) {
    const pos = commas[ci];
    const authorPart = trimmed.substring(pos + 1).trim();
    const titlePart = trimmed.substring(0, pos).trim();

    if (!titlePart || !authorPart) continue;

    if (looksLikeAuthor(authorPart) && titlePart.length >= 3) {
      return {
        title: cleanTitle(titlePart),
        author: cleanAuthor(authorPart),
      };
    }
  }

  return null;
}

/**
 * Determine if an author candidate string looks like a person's name.
 */
function looksLikeAuthor(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 3 || trimmed.length > 150) return false;

  // Clean artifacts
  const cleaned = trimmed
    .replace(/\band\s+and\b/g, 'and')
    .replace(/\s+and\s*$/, '')
    .trim();

  if (!cleaned) return false;

  // Split by " and " to get individual author names
  const authors = cleaned.split(/\s+and\s+/);

  // At least one should look like a name
  return authors.some((name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 6) return false;
    // At least one part should start with uppercase
    return parts.some((p) => /^[A-Z]/.test(p));
  });
}

/**
 * A stronger author match — used to distinguish book title blocks from highlights.
 * Requires the author part to look convincingly like a person's name.
 */
function isStrongAuthorMatch(author: string): boolean {
  const cleaned = author
    .replace(/\band\s+and\b/g, 'and')
    .replace(/\s+and\s*$/, '')
    .trim();

  if (!cleaned) return false;

  const authors = cleaned.split(/\s+and\s+/);

  // ALL author parts should look like names (not sentence fragments)
  return authors.every((name) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length < 2 || parts.length > 5) return false;

    // Most parts should be capitalized
    const capitalizedParts = parts.filter((p) => /^[A-Z]/.test(p));
    if (capitalizedParts.length < parts.length * 0.5) return false;

    // Should not contain common sentence words that make it look like a phrase
    const sentenceWords = ['the', 'a', 'an', 'is', 'was', 'were', 'are', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'that', 'which', 'who', 'whom', 'this', 'these', 'those', 'but', 'or', 'yet', 'so', 'for', 'nor', 'not', 'only', 'very', 'than', 'too', 'also', 'just', 'because', 'if', 'when', 'while', 'after', 'before', 'until', 'since', 'though'];
    const lowerParts = parts.map((p) => p.toLowerCase());
    const sentenceWordCount = lowerParts.filter((p) => sentenceWords.includes(p)).length;
    // Allow "and" connectors but not too many filler words
    if (sentenceWordCount > 1) return false;

    return true;
  });
}

function isVocabLookup(block: string): boolean {
  const trimmed = block.trim();
  return trimmed.length < 30 && !trimmed.includes(' ') && !trimmed.includes('\n') && /^[a-zA-Z,.\-]+$/.test(trimmed);
}

function cleanTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/&#39;/g, "'")
    .trim();
}

function cleanAuthor(author: string): string {
  return author
    .replace(/\band\s+and\b/g, 'and')
    .replace(/\s+and\s*$/, '')
    .replace(/\s+/g, ' ')
    .replace(/&#39;/g, "'")
    .trim() || null as unknown as string;
}
