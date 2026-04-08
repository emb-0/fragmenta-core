import { NextRequest } from 'next/server';
import { enrichBook, enrichBooksBackfill } from '@/lib/supabase/db';

/**
 * POST /api/books/enrich
 *
 * Enrich a single book or batch backfill.
 *
 * Body (single): { "book_id": "..." }
 * Body (batch):  { "backfill": true, "limit": 50, "force": false }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single-book enrichment
    if (body.book_id) {
      const book = await enrichBook(body.book_id);
      return Response.json({ data: book, error: null });
    }

    // Batch backfill
    if (body.backfill) {
      const stats = await enrichBooksBackfill({
        limit: body.limit || 50,
        force: body.force || false,
      });
      return Response.json({ data: stats, error: null });
    }

    return Response.json(
      { data: null, error: { message: 'Provide book_id or backfill: true', code: 'INVALID_INPUT' } },
      { status: 400 },
    );
  } catch (err) {
    console.error('Enrich error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return Response.json(
      { data: null, error: { message, code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR' } },
      { status },
    );
  }
}
