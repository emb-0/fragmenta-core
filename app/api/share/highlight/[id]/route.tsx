import type { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { getHighlight } from '@/lib/supabase/db';

export const dynamic = 'force-dynamic';

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  // Find last space before maxLength to avoid cutting mid-word
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '...';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      return new Response('Invalid highlight ID', { status: 400 });
    }

    const highlight = await getHighlight(id);
    if (!highlight) {
      return new Response('Highlight not found', { status: 404 });
    }

    const text = highlight.text;
    const title = highlight.book.canonical_title;
    const author = highlight.book.canonical_author;
    const hasNote = !!highlight.note_text;

    // Determine font size based on text length
    let fontSize = 32;
    let maxChars = 480;
    if (text.length > 400) {
      fontSize = 24;
      maxChars = 600;
    } else if (text.length > 250) {
      fontSize = 28;
      maxChars = 520;
    } else if (text.length < 80) {
      fontSize = 40;
      maxChars = 200;
    }

    const displayText = truncateText(text, maxChars);

    // Build the citation line
    const citation = author ? `${title} — ${author}` : title;

    const imageResponse = new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: '#07090C',
            padding: '0',
            position: 'relative',
          }}
        >
          {/* Subtle gradient overlay at top-right, mimicking the app glow */}
          <div
            style={{
              position: 'absolute',
              top: '-60px',
              right: '-40px',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'rgba(109, 138, 168, 0.12)',
              filter: 'blur(80px)',
              display: 'flex',
            }}
          />
          {/* Subtle warm glow at bottom-left */}
          <div
            style={{
              position: 'absolute',
              bottom: '40px',
              left: '-60px',
              width: '360px',
              height: '360px',
              borderRadius: '50%',
              background: 'rgba(142, 125, 104, 0.10)',
              filter: 'blur(100px)',
              display: 'flex',
            }}
          />

          {/* Card container */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              width: '1080px',
              height: '510px',
              background: '#121821',
              borderRadius: '28px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '48px 56px',
              position: 'relative',
              boxShadow: '0 16px 24px rgba(0, 0, 0, 0.85), 0 10px 18px rgba(142, 125, 104, 0.15)',
            }}
          >
            {/* Warm gradient sheen on the card */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: '28px',
                background: 'linear-gradient(135deg, rgba(142, 125, 104, 0.04) 0%, transparent 60%)',
                display: 'flex',
              }}
            />

            {/* Quote text */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: `${fontSize}px`,
                  lineHeight: 1.65,
                  color: '#F3F5F8',
                  display: 'flex',
                }}
              >
                {`\u201C${displayText}\u201D`}
              </div>
            </div>

            {/* Bottom row: citation + branding */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                position: 'relative',
              }}
            >
              {/* Citation */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  maxWidth: '700px',
                }}
              >
                {hasNote && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '4px',
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#8E7D68',
                        display: 'flex',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#8E7D68',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Has note
                    </span>
                  </div>
                )}
                <div
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '16px',
                    fontWeight: 500,
                    color: '#B5BEC9',
                    display: 'flex',
                  }}
                >
                  {truncateText(citation, 80)}
                </div>
              </div>

              {/* Fragmenta branding */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '6px',
                    height: '24px',
                    borderRadius: '3px',
                    background: 'linear-gradient(180deg, #6D8AA8 0%, #8E7D68 100%)',
                    display: 'flex',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#7F8A96',
                    letterSpacing: '-0.01em',
                  }}
                >
                  Fragmenta
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      },
    );

    // Handle download param
    const download = req.nextUrl.searchParams.get('download');
    if (download === '1') {
      const imageBuffer = await imageResponse.arrayBuffer();
      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Content-Disposition': `attachment; filename="fragmenta-highlight-${id.slice(0, 8)}.png"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    return imageResponse;
  } catch (err) {
    console.error('Share card generation error:', err);
    return new Response('Failed to generate share card', { status: 500 });
  }
}
