import type { NextRequest } from 'next/server';
import { listImports } from '@/lib/supabase/db';
import { buildPagination } from '@/lib/api/ios-compat';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const offset = (Math.max(1, page) - 1) * limit;

    const imports = await listImports();
    const paged = imports.slice(offset, offset + limit);

    // Transform to iOS ImportRecord shape
    const items = paged.map((imp) => ({
      id: imp.id,
      status: imp.parse_status,
      summary: imp.import_summary
        ? {
            books_detected: imp.import_summary.books_found,
            highlights_detected: imp.import_summary.highlights_found,
            notes_detected: imp.import_summary.notes_found,
            duplicates_detected: imp.import_summary.highlights_skipped_duplicate,
            warnings_count: imp.import_summary.warnings?.length ?? 0,
            warnings: imp.import_summary.warnings || [],
          }
        : null,
      books_created: imp.import_summary?.books_created ?? null,
      books_updated: imp.import_summary?.books_existing ?? null,
      filename: imp.filename,
      source: imp.source_type,
      created_at: imp.created_at,
      completed_at: imp.parse_status === 'completed' ? imp.created_at : null,
      message: imp.error_message,
      // Original fields
      source_type: imp.source_type,
      parse_status: imp.parse_status,
      import_summary: imp.import_summary,
      error_message: imp.error_message,
    }));

    return Response.json({
      data: {
        imports: items,
        pagination: buildPagination(imports.length, limit, offset),
      },
      error: null,
    });
  } catch (err) {
    console.error('List imports error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
