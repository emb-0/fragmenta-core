import type { NextRequest } from 'next/server';
import { getBook, generateAndCacheBookSummary } from '@/lib/supabase/db';
import { createServerClient } from '@/lib/supabase/client';

function summaryResponse(summary: { summary: string; updated_at: string; model: string; highlight_count_at_generation: number }) {
  return {
    // iOS-expected fields
    summary: summary.summary,
    themes: [],
    updated_at: summary.updated_at,
    // Original fields (kept for backward compat)
    model: summary.model,
    generated_at: summary.updated_at,
    highlight_count: summary.highlight_count_at_generation,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const book = await getBook(id);
    if (!book) {
      return Response.json(
        { data: null, error: { message: 'Book not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    const summary = await generateAndCacheBookSummary(id);

    if (!summary) {
      return Response.json(
        {
          data: null,
          error: { message: 'AI summarization not configured', code: 'AI_UNAVAILABLE' },
        },
        { status: 503 },
      );
    }

    return Response.json({ data: summaryResponse(summary), error: null });
  } catch (err) {
    console.error('Get book summary error:', err);
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

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid book ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const book = await getBook(id);
    if (!book) {
      return Response.json(
        { data: null, error: { message: 'Book not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    // Delete existing cached summary to force regeneration
    const supabase = createServerClient();
    await supabase.from('book_summaries').delete().eq('book_id', id);

    const summary = await generateAndCacheBookSummary(id);

    if (!summary) {
      return Response.json(
        {
          data: null,
          error: { message: 'AI summarization not configured', code: 'AI_UNAVAILABLE' },
        },
        { status: 503 },
      );
    }

    return Response.json({ data: summaryResponse(summary), error: null });
  } catch (err) {
    console.error('Regenerate book summary error:', err);
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
