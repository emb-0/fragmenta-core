import type { NextRequest } from 'next/server';
import { getImport } from '@/lib/supabase/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid import ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const imp = await getImport(id);
    if (!imp) {
      return Response.json(
        { data: null, error: { message: 'Import not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    // Don't return raw_text in the list — it can be huge
    const { raw_text: _, ...importWithoutRaw } = imp;
    return Response.json({ data: { ...importWithoutRaw, raw_text_length: imp.raw_text.length }, error: null });
  } catch (err) {
    console.error('Get import error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
