import type { NextRequest } from 'next/server';
import { removeBookFromCollection } from '@/lib/supabase/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; bookId: string }> },
) {
  try {
    const { id, bookId } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid collection ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    if (!bookId || !/^[0-9a-f-]{36}$/.test(bookId)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    await removeBookFromCollection(id, bookId);
    return Response.json({ data: { removed: true }, error: null });
  } catch (err) {
    console.error('Remove book from collection error:', err);
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
