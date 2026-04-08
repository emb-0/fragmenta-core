/**
 * GET /api/highlights/[id]/share-card
 *
 * Primary share card endpoint for iOS.
 * Proxies to the existing /api/share/highlight/[id]?download=1 route.
 */
import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return Response.json(
      { data: null, error: { message: 'Invalid highlight ID', code: 'INVALID_ID' } },
      { status: 400 },
    );
  }

  // Build the URL to the canonical share card route
  const url = new URL(request.url);
  const shareUrl = new URL(`/api/share/highlight/${id}`, url.origin);
  shareUrl.searchParams.set('download', '1');

  // Proxy to the existing share card handler
  const res = await fetch(shareUrl.toString(), {
    headers: { 'accept': 'image/png' },
  });

  if (!res.ok) {
    return new Response(res.body, {
      status: res.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'content-type': res.headers.get('content-type') || 'image/png',
      'content-disposition': `attachment; filename="highlight-${id}.png"`,
      'cache-control': 'public, max-age=3600',
    },
  });
}
