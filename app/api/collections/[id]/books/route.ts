import type { NextRequest } from 'next/server';
import { addBookToCollection } from '@/lib/supabase/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid collection ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { book_id } = body;

    if (!book_id || typeof book_id !== 'string' || !/^[0-9a-f-]{36}$/.test(book_id)) {
      return Response.json(
        { data: null, error: { message: 'book_id is required and must be a valid UUID', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const collectionBook = await addBookToCollection(id, book_id);
    return Response.json({ data: collectionBook, error: null }, { status: 201 });
  } catch (err) {
    console.error('Add book to collection error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('already in this collection') ? 409 : 500;
    return Response.json(
      {
        data: null,
        error: {
          message,
          code: status === 409 ? 'DUPLICATE' : 'INTERNAL_ERROR',
        },
      },
      { status },
    );
  }
}
