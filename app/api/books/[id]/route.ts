import type { NextRequest } from 'next/server';
import { getBook, updateBook, deleteBook } from '@/lib/supabase/db';

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

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { canonical_title, canonical_author } = body;

    if (canonical_title !== undefined && (typeof canonical_title !== 'string' || !canonical_title.trim())) {
      return Response.json(
        { data: null, error: { message: 'canonical_title must be a non-empty string', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    if (canonical_author !== undefined && canonical_author !== null && typeof canonical_author !== 'string') {
      return Response.json(
        { data: null, error: { message: 'canonical_author must be a string or null', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const updated = await updateBook(id, { canonical_title, canonical_author });
    return Response.json({ data: updated, error: null });
  } catch (err) {
    console.error('Update book error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return Response.json(
      { data: null, error: { message, code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR' } },
      { status },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const result = await deleteBook(id);
    return Response.json({
      data: {
        deleted: true,
        deleted_highlights: result.deletedHighlights,
      },
      error: null,
    });
  } catch (err) {
    console.error('Delete book error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json(
      { data: null, error: { message, code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
