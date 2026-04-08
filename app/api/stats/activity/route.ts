import type { NextRequest } from 'next/server';
import { getActivityTimeline } from '@/lib/supabase/db';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const months = Math.min(
      Math.max(parseInt(url.searchParams.get('months') || '12', 10), 1),
      60,
    );

    const timeline = await getActivityTimeline(months);
    return Response.json({ data: timeline, error: null });
  } catch (err) {
    console.error('Stats activity error:', err);
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
