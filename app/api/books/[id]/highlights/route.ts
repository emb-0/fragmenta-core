import type { NextRequest } from 'next/server';
import { getHighlightsForBook } from '@/lib/supabase/db';
import { buildPagination, pageToOffset, transformHighlight } from '@/lib/api/ios-compat';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10), 500);
    // Accept both offset (web) and page (iOS) params
    const pageParam = url.searchParams.get('page');
    const offset = pageParam
      ? pageToOffset(parseInt(pageParam, 10), limit)
      : parseInt(url.searchParams.get('offset') || '0', 10);
    const sort = (url.searchParams.get('sort') || 'sequence') as 'sequence' | 'recent';
    const hasNotes = url.searchParams.get('has_notes') === 'true';

    const { highlights, total } = await getHighlightsForBook(id, {
      limit,
      offset,
      sort,
      hasNotes: hasNotes || undefined,
    });

    return Response.json({
      data: {
        highlights: highlights.map((h) => transformHighlight(h)),
        total,
        limit,
        offset,
        pagination: buildPagination(total, limit, offset),
      },
      error: null,
    });
  } catch (err) {
    console.error('Get highlights error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
