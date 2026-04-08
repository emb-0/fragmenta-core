import type { NextRequest } from 'next/server';
import { listCollections, createCollection } from '@/lib/supabase/db';
import { transformCollection, buildPagination } from '@/lib/api/ios-compat';
import type { Book } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (Math.max(1, page) - 1) * limit;

    const collections = await listCollections();
    const paged = collections.slice(offset, offset + limit);

    return Response.json({
      data: {
        items: paged.map((c) =>
          transformCollection({ ...c, books: [] as Book[] }),
        ),
        pagination: buildPagination(collections.length, limit, offset),
      },
      error: null,
    });
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
    // Accept both iOS (title) and web (name) field names
    const name = body.name || body.title;
    const description = body.description ?? body.summary;

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
    return Response.json({
      data: transformCollection({ ...collection, book_count: 0, books: [] as Book[] }),
      error: null,
    }, { status: 201 });
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
