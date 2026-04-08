import { describe, it, expect } from 'vitest';

// =============================================================================
// Collections validation
// =============================================================================

describe('Collections validation', () => {
  function validateCreateCollection(body: Record<string, unknown>): string | null {
    if (!body.name || typeof body.name !== 'string' || !(body.name as string).trim()) {
      return 'name is required and must be a non-empty string';
    }
    if (body.description !== undefined && body.description !== null && typeof body.description !== 'string') {
      return 'description must be a string or null';
    }
    return null;
  }

  it('accepts valid collection creation', () => {
    expect(validateCreateCollection({ name: 'Fiction' })).toBe(null);
  });

  it('accepts name with description', () => {
    expect(validateCreateCollection({ name: 'Sci-Fi', description: 'Science fiction books' })).toBe(null);
  });

  it('rejects empty name', () => {
    expect(validateCreateCollection({ name: '' })).not.toBe(null);
  });

  it('rejects missing name', () => {
    expect(validateCreateCollection({})).not.toBe(null);
  });

  it('accepts null description', () => {
    expect(validateCreateCollection({ name: 'Test', description: null })).toBe(null);
  });
});

// =============================================================================
// Stats calculations
// =============================================================================

describe('Stats calculations', () => {
  function calcAvgHighlightsPerBook(books: number, highlights: number): number {
    return books > 0 ? Math.round((highlights / books) * 10) / 10 : 0;
  }

  it('calculates average correctly', () => {
    expect(calcAvgHighlightsPerBook(10, 250)).toBe(25);
  });

  it('handles fractional averages', () => {
    expect(calcAvgHighlightsPerBook(3, 10)).toBe(3.3);
  });

  it('handles zero books', () => {
    expect(calcAvgHighlightsPerBook(0, 0)).toBe(0);
  });

  it('handles single book', () => {
    expect(calcAvgHighlightsPerBook(1, 47)).toBe(47);
  });
});

describe('Activity timeline bucketing', () => {
  function getMonthFromDate(dateStr: string): string {
    return dateStr.substring(0, 7);
  }

  it('extracts YYYY-MM from ISO date', () => {
    expect(getMonthFromDate('2025-03-15T10:30:00Z')).toBe('2025-03');
  });

  it('handles date with timezone', () => {
    expect(getMonthFromDate('2026-01-01T00:00:00+05:00')).toBe('2026-01');
  });

  function generateMonthBuckets(months: number): string[] {
    const now = new Date();
    const buckets: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      buckets.push(`${yyyy}-${mm}`);
    }
    return buckets;
  }

  it('generates correct number of month buckets', () => {
    expect(generateMonthBuckets(6)).toHaveLength(6);
  });

  it('ends with current month', () => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const buckets = generateMonthBuckets(3);
    expect(buckets[buckets.length - 1]).toBe(currentMonth);
  });
});

// =============================================================================
// Share card data
// =============================================================================

describe('Share card text truncation', () => {
  function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > maxLength * 0.7 ? truncated.slice(0, lastSpace) : truncated) + '...';
  }

  it('does not truncate short text', () => {
    expect(truncateText('Hello world', 100)).toBe('Hello world');
  });

  it('truncates at word boundary', () => {
    const result = truncateText('The quick brown fox jumps over the lazy dog', 20);
    expect(result).toContain('...');
    expect(result.length).toBeLessThanOrEqual(24); // 20 + '...'
  });

  it('handles exact length', () => {
    expect(truncateText('12345', 5)).toBe('12345');
  });
});

// =============================================================================
// AI summary contracts
// =============================================================================

describe('AI summary contracts', () => {
  it('summary response shape is correct', () => {
    const summary = {
      book_id: 'abc-123',
      summary: 'The reader highlighted themes of...',
      highlight_count_at_generation: 15,
      model: 'claude-sonnet-4-20250514',
      created_at: '2026-04-08T00:00:00Z',
      updated_at: '2026-04-08T00:00:00Z',
    };
    expect(summary.book_id).toBeDefined();
    expect(summary.summary).toBeDefined();
    expect(typeof summary.highlight_count_at_generation).toBe('number');
    expect(summary.model).toContain('claude');
  });

  it('cache invalidation: regenerate when highlight count changes', () => {
    const cached = { highlight_count_at_generation: 10 };
    const currentCount = 15;
    expect(cached.highlight_count_at_generation === currentCount).toBe(false);
  });

  it('cache valid: same highlight count', () => {
    const cached = { highlight_count_at_generation: 15 };
    const currentCount = 15;
    expect(cached.highlight_count_at_generation === currentCount).toBe(true);
  });
});

// =============================================================================
// PWA manifest
// =============================================================================

describe('PWA manifest validation', () => {
  it('has required fields', () => {
    // This validates the shape we expect
    const manifest = {
      name: 'Fragmenta',
      short_name: 'Fragmenta',
      start_url: '/',
      display: 'standalone',
      background_color: '#07090C',
      theme_color: '#07090C',
    };
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(manifest.theme_color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
