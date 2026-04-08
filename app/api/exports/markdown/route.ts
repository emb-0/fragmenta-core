import type { NextRequest } from 'next/server';
import { exportAllHighlights } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get('book_id') || undefined;

    const { books } = await exportAllHighlights({ bookId });

    const lines: string[] = ['# Fragmenta Highlights Export', ''];

    for (const book of books) {
      if (book.highlights.length === 0) continue;

      lines.push(`## ${book.canonical_title}`);
      if (book.canonical_author) {
        lines.push(`*${book.canonical_author}*`);
      }
      lines.push(`${book.highlights.length} highlights`);
      lines.push('');

      for (const h of book.highlights) {
        lines.push(`> ${h.text}`);
        if (h.note_text) {
          lines.push('');
          lines.push(`**Note:** ${h.note_text}`);
        }
        if (h.source_location) {
          lines.push('');
          lines.push(`*${h.source_location}*`);
        }
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    const markdown = lines.join('\n');

    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fragmenta-highlights.md"',
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
