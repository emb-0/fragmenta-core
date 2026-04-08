import type { NextRequest } from 'next/server';
import { searchHighlights, searchBooks } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q');

    if (!q || q.trim().length === 0) {
      return Response.json(
        { data: null, error: { message: 'Missing search query "q"', code: 'MISSING_QUERY' } },
        { status: 400 },
      );
    }

    if (q.length > 500) {
      return Response.json(
        { data: null, error: { message: 'Query too long (max 500 chars)', code: 'QUERY_TOO_LONG' } },
        { status: 400 },
      );
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    const bookId = url.searchParams.get('book_id') || undefined;
    const hasNotes = url.searchParams.get('has_notes') === 'true' || undefined;
    const sort = (url.searchParams.get('sort') || 'relevance') as 'relevance' | 'recent' | 'book';

    const [highlightResults, bookResults] = await Promise.all([
      searchHighlights(q, { limit, offset, bookId, hasNotes, sort }),
      offset === 0 ? searchBooks(q) : Promise.resolve([]),
    ]);

    return Response.json({
      data: {
        highlights: highlightResults.results,
        books: bookResults,
        total: highlightResults.total,
        limit,
        offset,
        query: q,
      },
      error: null,
    });
  } catch (err) {
    console.error('Search error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
