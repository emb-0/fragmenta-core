export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    data: {
      ok: true,
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      features: {
        google_books_configured: !!process.env.GOOGLE_BOOKS_API_KEY,
        anthropic_configured: !!process.env.ANTHROPIC_API_KEY,
        supabase_configured:
          !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
          !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    },
    error: null,
  });
}
