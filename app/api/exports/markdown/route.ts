import type { NextRequest } from 'next/server';
import { exportAllHighlights } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get('book_id') || undefined;

    const { books } = await exportAllHighlights({ bookId });

    const lines: string[] = [];

    if (bookId && books.length === 1) {
      // Single-book export: cleaner format
      const book = books[0];
      lines.push(`# ${book.canonical_title}`);
      if (book.canonical_author) {
        lines.push(`### ${book.canonical_author}`);
      }
      lines.push('');
      lines.push(`*${book.highlights.length} highlights exported from Fragmenta*`);
      lines.push('');
      lines.push('---');
      lines.push('');

      for (const h of book.highlights) {
        lines.push(`> ${h.text.replace(/\n/g, '\n> ')}`);
        lines.push('');
        if (h.note_text) {
          lines.push(`**Note:** ${h.note_text}`);
          lines.push('');
        }
        if (h.source_location) {
          lines.push(`<sub>${h.source_location}</sub>`);
          lines.push('');
        }
        lines.push('---');
        lines.push('');
      }
    } else {
      // Multi-book export
      lines.push('# Fragmenta Highlights Export');
      lines.push('');
      lines.push(`*${books.reduce((n, b) => n + b.highlights.length, 0)} highlights across ${books.length} books*`);
      lines.push('');

      for (const book of books) {
        if (book.highlights.length === 0) continue;

        lines.push('---');
        lines.push('');
        lines.push(`## ${book.canonical_title}`);
        if (book.canonical_author) {
          lines.push(`### ${book.canonical_author}`);
        }
        lines.push(`*${book.highlights.length} highlights*`);
        lines.push('');

        for (const h of book.highlights) {
          lines.push(`> ${h.text.replace(/\n/g, '\n> ')}`);
          lines.push('');
          if (h.note_text) {
            lines.push(`**Note:** ${h.note_text}`);
            lines.push('');
          }
          if (h.source_location) {
            lines.push(`<sub>${h.source_location}</sub>`);
            lines.push('');
          }
          lines.push('---');
          lines.push('');
        }
      }
    }

    const markdown = lines.join('\n');

    // Use per-book filename when exporting a single book
    let filename = 'fragmenta-highlights.md';
    if (bookId && books.length === 1) {
      const slug = books[0].canonical_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60);
      filename = `${slug}-highlights.md`;
    }

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Export markdown error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
