/**
 * GET /api/books/[id]/collections
 *
 * Returns collections that contain a given book.
 * iOS calls this to show which collections a book belongs to.
 */
import type { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';
import { transformCollection } from '@/lib/api/ios-compat';
import type { Collection, Book } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Find all collection IDs containing this book
    const { data: memberships, error: mErr } = await supabase
      .from('collection_books')
      .select('collection_id')
      .eq('book_id', id);

    if (mErr) throw new Error(`Failed to query memberships: ${mErr.message}`);

    const collectionIds = (memberships || []).map(
      (m: Record<string, unknown>) => m.collection_id as string,
    );

    if (collectionIds.length === 0) {
      return Response.json({
        data: {
          items: [],
          pagination: { page: 1, limit: 50, total: 0, has_more: false, next_page: null },
        },
        error: null,
      });
    }

    const { data: collections, error: cErr } = await supabase
      .from('collections')
      .select('*')
      .in('id', collectionIds)
      .order('name', { ascending: true });

    if (cErr) throw new Error(`Failed to fetch collections: ${cErr.message}`);

    const items = (collections || []).map((c: Record<string, unknown>) =>
      transformCollection(c as unknown as Collection & { book_count?: number; books?: Book[] }, id),
    );

    return Response.json({
      data: {
        items,
        pagination: {
          page: 1,
          limit: 50,
          total: items.length,
          has_more: false,
          next_page: null,
        },
      },
      error: null,
    });
  } catch (err) {
    console.error('Book collections error:', err);
    return Response.json(
      {
        data: null,
        error: {
          message: err instanceof Error ? err.message : 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
      },
      { status: 500 },
    );
  }
}
