import type { NextRequest } from 'next/server';
import { getCollection, updateCollection, deleteCollection } from '@/lib/supabase/db';
import { transformCollection, transformBooks } from '@/lib/api/ios-compat';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid collection ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const collection = await getCollection(id);
    if (!collection) {
      return Response.json(
        { data: null, error: { message: 'Collection not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    // iOS CollectionDetail expects: title, summary, tags, books, book_count
    return Response.json({
      data: {
        ...collection,
        // iOS aliases
        title: collection.name,
        summary: collection.description,
        tags: [],
        book_count: collection.books.length,
        highlight_count: 0,
        note_count: 0,
        // Transform books for iOS
        books: transformBooks(collection.books),
      },
      error: null,
    });
  } catch (err) {
    console.error('Get collection error:', err);
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
        { data: null, error: { message: 'Invalid collection ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const body = await req.json();
    const name = body.name || body.title;
    const description = body.description ?? body.summary;

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return Response.json(
        { data: null, error: { message: 'name must be a non-empty string', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      return Response.json(
        { data: null, error: { message: 'description must be a string or null', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const updated = await updateCollection(id, { name, description });
    return Response.json({ data: { ...updated, title: updated.name, summary: updated.description, tags: [] }, error: null });
  } catch (err) {
    console.error('Update collection error:', err);
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
        { data: null, error: { message: 'Invalid collection ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    await deleteCollection(id);
    return Response.json({ data: { deleted: true }, error: null });
  } catch (err) {
    console.error('Delete collection error:', err);
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
