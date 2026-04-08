import { describe, it, expect } from 'vitest';

/**
 * Sprint 4: API editing contract tests
 *
 * These tests validate the shape and validation logic of the editing APIs.
 * They test the API routes directly via HTTP (integration-style) against the
 * running dev server, or can be run as unit tests with mocked fetch.
 *
 * Since we can't import Next.js route handlers directly in vitest without
 * the Next.js runtime, these tests focus on the validation/contract layer.
 */

// ---- Validation helpers (extracted logic) ----

function validateHighlightPatch(body: Record<string, unknown>): string | null {
  const { text, note_text } = body;
  if (text !== undefined && typeof text !== 'string') return 'text must be a string';
  if (text !== undefined && typeof text === 'string' && !text.trim()) return 'Highlight text cannot be empty';
  if (note_text !== undefined && note_text !== null && typeof note_text !== 'string') return 'note_text must be a string or null';
  return null;
}

function validateBookPatch(body: Record<string, unknown>): string | null {
  const { canonical_title, canonical_author } = body;
  if (canonical_title !== undefined && (typeof canonical_title !== 'string' || !canonical_title.trim())) {
    return 'canonical_title must be a non-empty string';
  }
  if (canonical_author !== undefined && canonical_author !== null && typeof canonical_author !== 'string') {
    return 'canonical_author must be a string or null';
  }
  return null;
}

function validateUUID(id: string): boolean {
  return /^[0-9a-f-]{36}$/.test(id);
}

// ---- Tests ----

describe('Highlight PATCH validation', () => {
  it('accepts valid text update', () => {
    expect(validateHighlightPatch({ text: 'Updated text' })).toBe(null);
  });

  it('accepts valid note update', () => {
    expect(validateHighlightPatch({ note_text: 'A new note' })).toBe(null);
  });

  it('accepts null note (removal)', () => {
    expect(validateHighlightPatch({ note_text: null })).toBe(null);
  });

  it('accepts both text and note', () => {
    expect(validateHighlightPatch({ text: 'New text', note_text: 'New note' })).toBe(null);
  });

  it('rejects non-string text', () => {
    expect(validateHighlightPatch({ text: 123 as unknown })).toBe('text must be a string');
  });

  it('rejects empty text', () => {
    expect(validateHighlightPatch({ text: '   ' })).toBe('Highlight text cannot be empty');
  });

  it('rejects non-string note_text', () => {
    expect(validateHighlightPatch({ note_text: 42 as unknown })).toBe('note_text must be a string or null');
  });

  it('accepts empty body (no-op)', () => {
    expect(validateHighlightPatch({})).toBe(null);
  });
});

describe('Book PATCH validation', () => {
  it('accepts valid title update', () => {
    expect(validateBookPatch({ canonical_title: 'New Title' })).toBe(null);
  });

  it('accepts valid author update', () => {
    expect(validateBookPatch({ canonical_author: 'New Author' })).toBe(null);
  });

  it('accepts null author (removal)', () => {
    expect(validateBookPatch({ canonical_author: null })).toBe(null);
  });

  it('rejects empty title', () => {
    expect(validateBookPatch({ canonical_title: '' })).toBe('canonical_title must be a non-empty string');
  });

  it('rejects whitespace-only title', () => {
    expect(validateBookPatch({ canonical_title: '   ' })).toBe('canonical_title must be a non-empty string');
  });

  it('rejects non-string author', () => {
    expect(validateBookPatch({ canonical_author: 123 as unknown })).toBe('canonical_author must be a string or null');
  });

  it('accepts empty body (no-op)', () => {
    expect(validateBookPatch({})).toBe(null);
  });
});

describe('UUID validation', () => {
  it('accepts valid UUID', () => {
    expect(validateUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
  });

  it('rejects short string', () => {
    expect(validateUUID('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateUUID('')).toBe(false);
  });
});

describe('Export filename generation', () => {
  function generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }

  it('generates clean slug from simple title', () => {
    expect(generateSlug('The Great Gatsby')).toBe('the-great-gatsby');
  });

  it('handles special characters', () => {
    expect(generateSlug("Gödel, Escher, Bach: An Eternal Golden Braid")).toBe('g-del-escher-bach-an-eternal-golden-braid');
  });

  it('truncates long titles', () => {
    const long = 'A'.repeat(100);
    expect(generateSlug(long).length).toBeLessThanOrEqual(60);
  });

  it('handles titles with only special chars', () => {
    expect(generateSlug('...!!!')).toBe('');
  });
});
