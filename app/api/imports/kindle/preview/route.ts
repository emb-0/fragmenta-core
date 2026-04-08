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
      if (!body.text || typeof body.text !== 'string') {
        return Response.json(
          { data: null, error: { message: 'Missing "text" field in request body', code: 'MISSING_TEXT' } },
          { status: 400 },
        );
      }
      rawText = body.text;
    }

    if (rawText.trim().length === 0) {
      return Response.json(
        { data: null, error: { message: 'Empty input text', code: 'EMPTY_INPUT' } },
        { status: 400 },
      );
    }

    const preview = previewKindle(rawText);

    return Response.json({
      data: preview,
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
