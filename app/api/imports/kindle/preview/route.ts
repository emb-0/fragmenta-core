import { NextRequest } from 'next/server';
import { previewKindle } from '@/lib/parser';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let rawText: string;

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
    }

    if (rawText.trim().length === 0) {
      return Response.json(
        { data: null, error: { message: 'Empty input text', code: 'EMPTY_INPUT' } },
        { status: 400 },
      );
    }

    const preview = previewKindle(rawText);

    // Return in shape iOS ImportPreview expects:
    // { summary, detected_books, message }
    return Response.json({
      data: {
        // iOS-expected fields
        summary: {
          books_detected: preview.books_detected,
          highlights_detected: preview.highlights_detected,
          notes_detected: preview.notes_detected,
          duplicates_detected: 0,
          warnings_count: preview.parse_warnings_count || 0,
          warnings: preview.warnings || [],
        },
        detected_books: (preview.books || []).map(
          (b) => ({
            title: b.title,
            author: b.author,
            highlight_count: b.highlight_count,
            note_count: b.note_count,
          }),
        ),
        message: null,
        // Original fields (backward compat)
        ...preview,
      },
      error: null,
    });
  } catch (err) {
    console.error('Preview error:', err);
    return Response.json(
      { data: null, error: { message: err instanceof Error ? err.message : 'Internal server error', code: 'INTERNAL_ERROR' } },
      { status: 500 },
    );
  }
}
