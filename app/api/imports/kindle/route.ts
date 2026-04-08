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
      if (!body.text || typeof body.text !== 'string') {
        return Response.json(
          { data: null, error: { message: 'Missing "text" field in request body', code: 'MISSING_TEXT' } },
          { status: 400 },
        );
      }
      rawText = body.text;
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
        import_id: importRecord.id,
        summary,
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
