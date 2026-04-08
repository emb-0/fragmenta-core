import { listBooks } from '@/lib/supabase/db';

export async function GET() {
  try {
    const books = await listBooks();
    return Response.json({ data: books, error: null });
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
