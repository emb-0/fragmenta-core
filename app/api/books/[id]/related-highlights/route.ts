/**
 * GET /api/books/[id]/related-highlights
 *
 * Returns highlights from other books that may be related.
 * Stub: returns empty results. Will be implemented with semantic search later.
 */
import type { NextRequest } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return Response.json(
      { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
      { status: 400 },
    );
  }

  // Stub — returns empty results until semantic search is implemented
  return Response.json({
    data: {
      items: [],
      pagination: { page: 1, limit: 8, total: 0, has_more: false, next_page: null },
    },
    error: null,
  });
}
