import type { NextRequest } from 'next/server';
import { exportAllHighlights } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const bookId = url.searchParams.get('book_id') || undefined;

    const { books } = await exportAllHighlights({ bookId });

    const exported = {
      exported_at: new Date().toISOString(),
      books: books.map((b) => ({
        title: b.canonical_title,
        author: b.canonical_author,
        highlight_count: b.highlights.length,
        highlights: b.highlights.map((h) => ({
          text: h.text,
          note: h.note_text,
          location: h.source_location,
          type: h.source_type,
          highlighted_at: h.highlighted_at,
          created_at: h.created_at,
        })),
      })),
    };

    return new Response(JSON.stringify(exported, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="fragmenta-highlights.json"',
      },
    });
  } catch (err) {
    console.error('Export JSON error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
