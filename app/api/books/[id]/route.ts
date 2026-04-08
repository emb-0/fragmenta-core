import type { NextRequest } from 'next/server';
import { getBook } from '@/lib/supabase/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const book = await getBook(id);
    if (!book) {
      return Response.json(
        { data: null, error: { message: 'Book not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    return Response.json({ data: book, error: null });
  } catch (err) {
    console.error('Get book error:', err);
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
