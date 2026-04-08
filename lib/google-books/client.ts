/**
 * Google Books API client — server-side only.
 * Adapted from nanarose-library pattern.
 */

import { scoreMatch, isQueryable, type MatchConfidence } from './match';

const API_BASE = 'https://www.googleapis.com/books/v1/volumes';
const REQUEST_TIMEOUT = 10_000;

export interface GoogleBooksResult {
  googleBooksId: string;
  title: string;
  authors: string[] | null;
  subtitle: string | null;
  publisher: string | null;
  publishedDate: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  infoLink: string | null;
  confidence: MatchConfidence;
  titleSimilarity: number;
  authorSimilarity: number;
}

function cleanImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  let u = url.replace(/^http:\/\//, 'https://');
  try {
    const p = new URL(u);
    p.searchParams.delete('edge'); // Remove page-curl effect
    return p.toString();
  } catch {
    return u;
  }
}

function getCoverUrl(imageLinks: Record<string, string> | undefined): string | null {
  if (!imageLinks) return null;
  // Prefer medium/large, fall back to thumbnail
  const raw = imageLinks.medium || imageLinks.large || imageLinks.thumbnail || imageLinks.smallThumbnail;
  return cleanImageUrl(raw);
}

function getThumbnailUrl(imageLinks: Record<string, string> | undefined): string | null {
  if (!imageLinks) return null;
  const raw = imageLinks.smallThumbnail || imageLinks.thumbnail;
  return cleanImageUrl(raw);
}

export async function searchGoogleBooks(
  title: string,
  author: string | null,
): Promise<GoogleBooksResult | null> {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    console.warn('GOOGLE_BOOKS_API_KEY not set, skipping enrichment');
    return null;
  }

  if (!isQueryable(title, author)) {
    return null;
  }

  // Build query: intitle + optional inauthor
  let q = `intitle:${title}`;
  if (author && author.length > 1) {
    q += `+inauthor:${author}`;
  }

  const url = `${API_BASE}?q=${encodeURIComponent(q)}&maxResults=3&printType=books&key=${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      console.error(`Google Books API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return null;
    }

    // Score each result and pick the best
    let bestResult: GoogleBooksResult | null = null;
    let bestScore = -1;

    for (const item of data.items) {
      const vi = item.volumeInfo || {};
      const score = scoreMatch(
        title,
        author,
        vi.title || '',
        vi.authors || null,
      );

      // Skip low-confidence matches
      if (score.confidence === 'low') continue;

      const combinedScore = score.titleSimilarity * 2 + score.authorSimilarity;
      if (combinedScore > bestScore) {
        bestScore = combinedScore;
        bestResult = {
          googleBooksId: item.id,
          title: vi.title || '',
          authors: vi.authors || null,
          subtitle: vi.subtitle || null,
          publisher: vi.publisher || null,
          publishedDate: vi.publishedDate || null,
          pageCount: vi.pageCount && vi.pageCount > 0 ? vi.pageCount : null,
          coverUrl: getCoverUrl(vi.imageLinks),
          thumbnailUrl: getThumbnailUrl(vi.imageLinks),
          infoLink: vi.infoLink ? vi.infoLink.replace(/^http:\/\//, 'https://') : null,
          confidence: score.confidence,
          titleSimilarity: score.titleSimilarity,
          authorSimilarity: score.authorSimilarity,
        };
      }
    }

    return bestResult;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.error('Google Books API timeout');
    } else {
      console.error('Google Books API error:', err);
    }
    return null;
  }
}
