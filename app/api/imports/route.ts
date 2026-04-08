import { listImports } from '@/lib/supabase/db';

export async function GET() {
  try {
    const imports = await listImports();
    return Response.json({ data: imports, error: null });
  } catch (err) {
    console.error('List imports error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
