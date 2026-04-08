import type { NextRequest } from 'next/server';
import { listCollections, createCollection } from '@/lib/supabase/db';

export async function GET() {
  try {
    const collections = await listCollections();
    return Response.json({ data: collections, error: null });
  } catch (err) {
    console.error('List collections error:', err);
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return Response.json(
        { data: null, error: { message: 'name is required and must be a non-empty string', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      return Response.json(
        { data: null, error: { message: 'description must be a string or null', code: 'INVALID_INPUT' } },
        { status: 400 },
      );
    }

    const collection = await createCollection(name, description);
    return Response.json({ data: collection, error: null }, { status: 201 });
  } catch (err) {
    console.error('Create collection error:', err);
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
