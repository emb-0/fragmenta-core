/**
 * Title and author canonicalization utilities.
 * Normalizes formatting artifacts without hallucinating metadata.
 */

export function canonicalizeTitle(raw: string): string {
  let t = raw.trim();
  // Normalize whitespace
  t = t.replace(/\s+/g, ' ');
  // Remove HTML entities
  t = t.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  t = t.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  // Normalize dashes
  t = t.replace(/--/g, '\u2014');
  // Remove trailing period if it's just a formatting artifact
  if (t.endsWith('.') && !t.endsWith('...') && !t.endsWith('Jr.') && !t.endsWith('Sr.')) {
    t = t.slice(0, -1).trim();
  }
  return t;
}

export function canonicalizeAuthor(raw: string | null): string | null {
  if (!raw) return null;
  let a = raw.trim();
  if (!a) return null;
  // Normalize whitespace (fix double spaces)
  a = a.replace(/\s+/g, ' ');
  // Fix "and and" artifacts
  a = a.replace(/\band\s+and\b/g, 'and');
  // Remove trailing "and" or "and "
  a = a.replace(/\s+and\s*$/, '');
  // Remove HTML entities
  a = a.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));
  a = a.replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
  a = a.replace(/&amp;/g, '&');
  return a || null;
}

/**
 * Normalize text for hashing — more aggressive normalization for dedup.
 */
export function normalizeForHash(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/\u2014/g, '--')
    .replace(/\u2013/g, '-')
    .replace(/…/g, '...');
}
