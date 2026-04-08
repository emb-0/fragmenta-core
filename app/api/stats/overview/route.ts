import { getStatsOverview } from '@/lib/supabase/db';

export async function GET() {
  try {
    const stats = await getStatsOverview();
    return Response.json({ data: stats, error: null });
  } catch (err) {
    console.error('Stats overview error:', err);
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
