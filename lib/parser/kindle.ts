import type { ParsedBook, ParsedHighlight, ParseResult } from '@/lib/types';
import { createHash } from 'crypto';

// Kindle clipping separator
const SEPARATOR = '==========';

// Metadata line pattern: "- Your <Type> on <location> | Added on <date>"
// or "- Your <Type> at location <location> | Added on <date>"
const META_REGEX =
  /^-\s+Your\s+(Highlight|Note|Bookmark)\s+(?:on|at)\s+(?:page\s+(\d+)\s*(?:\|\s*)?)?(?:location\s+([\d-]+)\s*(?:\|\s*)?)?(?:\|\s*)?Added on\s+(.+)$/i;

// Book title line: "Title (Author)" or just "Title"
const TITLE_AUTHOR_REGEX = /^(.+?)\s*\(([^)]+)\)\s*$/;

export function parseKindleExport(text: string): ParseResult {
  const warnings: string[] = [];
  const bookMap = new Map<string, ParsedBook>();

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove BOM if present
  const clean = normalized.replace(/^\uFEFF/, '');

  // Split into clipping blocks
  const blocks = clean.split(SEPARATOR).map((b) => b.trim()).filter(Boolean);

  if (blocks.length === 0) {
    warnings.push('No clipping blocks found in the input text.');
    return { books: [], warnings };
  }

  let globalSequence = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const lines = block.split('\n').map((l) => l.trim());

    // Need at least: title line, metadata line, and content
    if (lines.length < 3) {
      warnings.push(`Block ${i + 1}: Too few lines (${lines.length}), skipping.`);
      continue;
    }

    // Line 0: Book title (Author)
    const titleLine = lines[0];
    const { title, author } = parseTitleAuthor(titleLine);

    // Line 1: Metadata (type, location, date)
    const metaLine = lines[1];
    const meta = parseMetaLine(metaLine);

    if (!meta) {
      warnings.push(`Block ${i + 1}: Could not parse metadata line: "${metaLine.substring(0, 80)}"`);
      continue;
    }

    // Skip bookmarks (no text content)
    if (meta.type === 'Bookmark') {
      continue;
    }

    // Lines 2+: Content (skip empty lines between metadata and content)
    const contentLines = lines.slice(2).filter((l) => l.length > 0);
    const content = contentLines.join('\n');

    if (!content) {
      warnings.push(`Block ${i + 1}: Empty content for "${title}", skipping.`);
      continue;
    }

    // Build book key for grouping
    const bookKey = buildBookKey(title, author);

    if (!bookMap.has(bookKey)) {
      bookMap.set(bookKey, {
        title,
        author,
        highlights: [],
      });
    }

    const book = bookMap.get(bookKey)!;

    // Handle notes: if this is a Note type, try to attach to the previous highlight
    if (meta.type === 'Note') {
      const prevHighlight = book.highlights[book.highlights.length - 1];
      if (prevHighlight && !prevHighlight.note && isSameLocation(prevHighlight.location, meta.location)) {
        prevHighlight.note = content;
        prevHighlight.rawBlock += '\n' + SEPARATOR + '\n' + block;
        continue;
      }
      // Standalone note — store as a highlight with note_text
      globalSequence++;
      book.highlights.push({
        text: content,
        note: null,
        location: meta.location,
        type: meta.type,
        date: meta.date,
        rawBlock: block,
      });
      continue;
    }

    // Regular highlight
    globalSequence++;
    book.highlights.push({
      text: content,
      note: null,
      location: meta.location,
      type: meta.type,
      date: meta.date,
      rawBlock: block,
    });
  }

  // Assign sequence numbers within each book
  for (const book of bookMap.values()) {
    book.highlights.forEach((h, idx) => {
      // sequence_number is set during DB insert based on array index
      void idx;
    });
  }

  const books = Array.from(bookMap.values()).filter((b) => b.highlights.length > 0);

  if (books.length === 0 && blocks.length > 0) {
    warnings.push('Blocks were found but no valid highlights could be extracted.');
  }

  return { books, warnings };
}

function parseTitleAuthor(line: string): { title: string; author: string | null } {
  // Remove BOM and trim
  const cleaned = line.replace(/^\uFEFF/, '').trim();
  const match = TITLE_AUTHOR_REGEX.exec(cleaned);
  if (match) {
    return { title: match[1].trim(), author: match[2].trim() };
  }
  return { title: cleaned, author: null };
}

function parseMetaLine(line: string): { type: string; location: string | null; date: string | null } | null {
  const match = META_REGEX.exec(line);
  if (!match) return null;

  const type = match[1];
  const page = match[2] || null;
  const location = match[3] || null;
  const date = match[4]?.trim() || null;

  // Build a location string
  let locationStr: string | null = null;
  if (page && location) {
    locationStr = `page ${page}, location ${location}`;
  } else if (page) {
    locationStr = `page ${page}`;
  } else if (location) {
    locationStr = `location ${location}`;
  }

  return { type, location: locationStr, date };
}

function isSameLocation(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a === b;
}

function buildBookKey(title: string, author: string | null): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(title) + '::' + (author ? norm(author) : '');
}

export function contentHash(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex').slice(0, 32);
}

export function bookContentHash(title: string, author: string | null): string {
  const input = (title.trim().toLowerCase()) + '::' + (author?.trim().toLowerCase() || '');
  return createHash('sha256').update(input).digest('hex').slice(0, 32);
}
