import type { NextRequest } from 'next/server';
import { getTopBooks } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      Math.max(parseInt(url.searchParams.get('limit') || '10', 10), 1),
      100,
    );

    const books = await getTopBooks(limit);
    return Response.json({ data: books, error: null });
  } catch (err) {
    console.error('Stats top books error:', err);
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
