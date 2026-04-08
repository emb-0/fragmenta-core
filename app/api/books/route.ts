import type { NextRequest } from 'next/server';
import { listBooks, type BookSortField } from '@/lib/supabase/db';
import { transformBooks, buildPagination } from '@/lib/api/ios-compat';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);

    // Map iOS sort values to core sort fields
    const sortParam = url.searchParams.get('sort') || 'recently_imported';
    const sortMap: Record<string, BookSortField> = {
      recently_imported: 'recent',
      recent: 'recent',
      title: 'title',
      author: 'author',
      highlight_count: 'highlights',
      highlights: 'highlights',
    };
    const sort = sortMap[sortParam] || 'recent';

    const hasNotes = url.searchParams.get('has_notes') === 'true' || undefined;

    const books = await listBooks({ sort, hasNotes });

    // Pagination (iOS sends page+limit, we slice in-memory for now)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (Math.max(1, page) - 1) * limit;
    const paged = books.slice(offset, offset + limit);

    return Response.json({
      data: {
        books: transformBooks(paged),
        pagination: buildPagination(books.length, limit, offset),
      },
      error: null,
    });
  } catch (err) {
    console.error('List books error:', err);
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
