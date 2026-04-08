import type { NextRequest } from 'next/server';
import { exportAllHighlights } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get('book_id') || undefined;

    const { books } = await exportAllHighlights({ bookId });

    const rows: string[] = [
      csvRow(['title', 'author', 'highlight_text', 'note_text', 'location', 'type', 'highlighted_at', 'created_at']),
    ];

    for (const book of books) {
      for (const h of book.highlights) {
        rows.push(csvRow([
          book.canonical_title,
          book.canonical_author || '',
          h.text,
          h.note_text || '',
          h.source_location || '',
          h.source_type || '',
          h.highlighted_at || '',
          h.created_at,
        ]));
      }
    }

    const csv = rows.join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fragmenta-highlights.csv"',
      },
    });
  } catch (err) {
    console.error('Export CSV error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}

function csvRow(fields: string[]): string {
  return fields.map((f) => `"${f.replace(/"/g, '""').replace(/\n/g, ' ')}"`).join(',');
}
