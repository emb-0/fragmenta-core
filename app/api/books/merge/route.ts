import { NextRequest } from 'next/server';
import { mergeBooks, getBook } from '@/lib/supabase/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keep_id, merge_id } = body;

    if (!keep_id || !merge_id) {
      return Response.json(
        { data: null, error: { message: 'Missing keep_id or merge_id', code: 'MISSING_IDS' } },
        { status: 400 },
      );
    }

    if (keep_id === merge_id) {
      return Response.json(
        { data: null, error: { message: 'Cannot merge a book with itself', code: 'SAME_BOOK' } },
        { status: 400 },
      );
    }

    const [keepBook, mergeBook] = await Promise.all([getBook(keep_id), getBook(merge_id)]);
    if (!keepBook || !mergeBook) {
      return Response.json(
        { data: null, error: { message: 'One or both books not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    await mergeBooks(keep_id, merge_id);

    const updatedBook = await getBook(keep_id);

    return Response.json({
      data: {
        merged_book: updatedBook,
        deleted_book_id: merge_id,
      },
      error: null,
    });
  } catch (err) {
    console.error('Merge books error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
