/**
 * Jaccard token-overlap matching for Google Books results.
 * Adapted from nanarose-library pattern.
 */

function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): Set<string> {
  return new Set(normalizeForMatch(s).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) {
    if (b.has(t)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

export type MatchConfidence = 'high' | 'medium' | 'low';

export interface MatchScore {
  titleSimilarity: number;
  authorSimilarity: number;
  confidence: MatchConfidence;
}

export function scoreMatch(
  queryTitle: string,
  queryAuthor: string | null,
  resultTitle: string,
  resultAuthors: string[] | null,
): MatchScore {
  const titleSimilarity = jaccard(tokenize(queryTitle), tokenize(resultTitle));

  let authorSimilarity = 0;
  if (queryAuthor && resultAuthors && resultAuthors.length > 0) {
    // Best match across all authors
    const queryTokens = tokenize(queryAuthor);
    authorSimilarity = Math.max(
      ...resultAuthors.map((a) => jaccard(queryTokens, tokenize(a))),
    );
  } else if (!queryAuthor && (!resultAuthors || resultAuthors.length === 0)) {
    // Both missing author — neutral
    authorSimilarity = 0.5;
  }

  let confidence: MatchConfidence;
  if (titleSimilarity >= 0.65 && authorSimilarity >= 0.35) {
    confidence = 'high';
  } else if (titleSimilarity >= 0.45) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return { titleSimilarity, authorSimilarity, confidence };
}

/** Returns true if the title looks like something we can query meaningfully */
export function isQueryable(title: string, author: string | null): boolean {
  const clean = normalizeForMatch(title);
  // Skip very short titles, bracketed/placeholder titles
  if (clean.length < 3) return false;
  if (title.startsWith('[') || title.startsWith('(')) return false;
  return true;
}
