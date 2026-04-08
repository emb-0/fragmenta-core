import { NextRequest } from 'next/server';
import { parseKindle } from '@/lib/parser';
import { createImport, updateImportStatus, ingestParseResult } from '@/lib/supabase/db';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText: string;
    let filename: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || !(file instanceof File)) {
        return Response.json(
          { data: null, error: { message: 'No file provided', code: 'MISSING_FILE' } },
          { status: 400 },
        );
      }
      rawText = await file.text();
      filename = file.name;
    } else {
      const body = await request.json();
      // Accept both web (text) and iOS (raw_text) field names
      const text = body.text || body.raw_text;
      if (!text || typeof text !== 'string') {
        return Response.json(
          { data: null, error: { message: 'Missing "text" field in request body', code: 'MISSING_TEXT' } },
          { status: 400 },
        );
      }
      rawText = text;
      filename = body.filename;
    }

    if (rawText.trim().length === 0) {
      return Response.json(
        { data: null, error: { message: 'Empty input text', code: 'EMPTY_INPUT' } },
        { status: 400 },
      );
    }

    // Parse with auto-detection
    const { books, warnings, format } = parseKindle(rawText);

    if (books.length === 0) {
      return Response.json(
        { data: null, error: { message: 'No books or highlights found in the input text', code: 'NO_CONTENT' } },
        { status: 422 },
      );
    }

    // Create import record
    const sourceType = format === 'clippings' ? 'kindle_txt' : 'kindle_notebook';
    const importRecord = await createImport(rawText, sourceType as 'kindle_txt' | 'kindle_notebook', filename);

    // Ingest
    await updateImportStatus(importRecord.id, 'processing');
    const summary = await ingestParseResult(importRecord.id, { books, warnings }, format);
    await updateImportStatus(importRecord.id, 'completed', summary);

    return Response.json({
      data: {
        // iOS-expected fields
        import_id: importRecord.id,
        status: 'completed',
        summary: {
          books_detected: summary.books_found,
          highlights_detected: summary.highlights_found,
          notes_detected: summary.notes_found,
          duplicates_detected: summary.highlights_skipped_duplicate,
          warnings_count: summary.warnings.length,
          warnings: summary.warnings,
        },
        books_created: summary.books_created,
        books_updated: summary.books_existing,
        created_at: importRecord.created_at,
        completed_at: new Date().toISOString(),
        filename: filename || null,
        message: null,
      },
      error: null,
    });
  } catch (err) {
    console.error('Import error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
