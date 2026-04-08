import type { NextRequest } from 'next/server';
import { getHighlight, updateHighlight, deleteHighlight } from '@/lib/supabase/db';
import { transformHighlight } from '@/lib/api/ios-compat';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid highlight ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const highlight = await getHighlight(id);
    if (!highlight) {
      return Response.json(
        { data: null, error: { message: 'Highlight not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    return Response.json({
      data: transformHighlight(highlight, highlight.book),
      error: null,
    });
  } catch (err) {
    console.error('Get highlight error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid highlight ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const body = await req.json();
    const { text, note_text } = body;

    if (text !== undefined && typeof text !== 'string') {
      return Response.json(
        { data: null, error: { message: 'text must be a string', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    if (note_text !== undefined && note_text !== null && typeof note_text !== 'string') {
      return Response.json(
        { data: null, error: { message: 'note_text must be a string or null', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const updated = await updateHighlight(id, { text, note_text });
    return Response.json({ data: updated, error: null });
  } catch (err) {
    console.error('Update highlight error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : message.includes('already exists') ? 409 : 500;
    return Response.json(
      { data: null, error: { message, code: status === 404 ? 'NOT_FOUND' : status === 409 ? 'DUPLICATE' : 'INTERNAL_ERROR' } },
      { status },
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid highlight ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const result = await deleteHighlight(id);
    return Response.json({ data: { deleted: true, book_id: result.bookId }, error: null });
  } catch (err) {
    console.error('Delete highlight error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('not found') ? 404 : 500;
    return Response.json(
      { data: null, error: { message, code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR' } },
      { status },
    );
  }
}
