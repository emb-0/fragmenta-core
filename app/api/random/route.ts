import { NextResponse } from 'next/server';
import { getRandomHighlight } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const highlight = await getRandomHighlight();

    if (!highlight) {
      return NextResponse.json(
        { data: null, error: { message: 'No highlights found', code: 'not_found' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: highlight, error: null });
  } catch (err) {
    return NextResponse.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal error', code: 'internal' } },
      { status: 500 },
    );
  }
}
