import type { NextRequest } from 'next/server';
import { getImport } from '@/lib/supabase/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return Response.json(
        { data: null, error: { message: 'Invalid import ID', code: 'INVALID_ID' } },
        { status: 400 },
      );
    }

    const imp = await getImport(id);
    if (!imp) {
      return Response.json(
        { data: null, error: { message: 'Import not found', code: 'NOT_FOUND' } },
        { status: 404 },
      );
    }

    // Don't return raw_text — it can be huge
    return Response.json({
      data: {
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
        raw_text_length: imp.raw_text.length,
      },
      error: null,
    });
  } catch (err) {
    console.error('Get import error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
