import type { NextRequest } from 'next/server';
import { searchHighlights, searchBooks } from '@/lib/supabase/db';
import { buildPagination, pageToOffset, transformSearchResult, transformBook } from '@/lib/api/ios-compat';

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
    // Accept both offset (web) and page (iOS) params
    const pageParam = url.searchParams.get('page');
    const offset = pageParam
      ? pageToOffset(parseInt(pageParam, 10), limit)
      : parseInt(url.searchParams.get('offset') || '0', 10);
    const bookId = url.searchParams.get('book_id') || undefined;
    const hasNotes = url.searchParams.get('has_notes') === 'true' || undefined;

    // Map iOS sort values to core sort values
    const sortParam = url.searchParams.get('sort') || 'relevance';
    const sortMap: Record<string, 'relevance' | 'recent' | 'book'> = {
      relevance: 'relevance',
      newest: 'recent',
      oldest: 'recent', // closest approximation
      recent: 'recent',
      book: 'book',
    };
    const sort = sortMap[sortParam] || 'relevance';

    // mode param (iOS sends "semantic" — ignored for now, using keyword search)
    // const mode = url.searchParams.get('mode');

    const [highlightResults, bookResults] = await Promise.all([
      searchHighlights(q, { limit, offset, bookId, hasNotes, sort }),
      offset === 0 ? searchBooks(q) : Promise.resolve([]),
    ]);

    return Response.json({
      data: {
        // iOS expects items/results as HighlightSearchResult objects
        results: highlightResults.results.map((r) => transformSearchResult(r, q)),
        // Also include legacy flat arrays for backward compat
        highlights: highlightResults.results.map((r) => r.highlight),
        books: bookResults.map(transformBook),
        total: highlightResults.total,
        limit,
        offset,
        query: q,
        pagination: buildPagination(highlightResults.total, limit, offset),
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
