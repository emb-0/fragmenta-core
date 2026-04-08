import type { NextRequest } from 'next/server';
import { getHighlight } from '@/lib/supabase/db';

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

    return Response.json({ data: highlight, error: null });
  } catch (err) {
    console.error('Get highlight error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
