"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface EnrichButtonProps {
  bookId: string;
  enrichmentStatus: string | null;
}

export function EnrichButton({ bookId, enrichmentStatus }: EnrichButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  if (enrichmentStatus === 'found') return null;

  async function handleEnrich() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/books/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_id: bookId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed');
      const status = json.data?.enrichment_status;
      setResult(status === 'found' ? 'Cover found!' : 'No match found');
      if (status === 'found') {
        router.refresh();
      }
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleEnrich}
        disabled={loading}
        className="btn-ghost"
        style={{ color: 'var(--accent)' }}
        title="Look up cover art and metadata from Google Books"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6" />
          <path d="M8 5v3l2 2" />
        </svg>
        {loading ? 'Looking up…' : enrichmentStatus === 'not_found' ? 'Retry lookup' : 'Find cover'}
      </button>
      {result && (
        <span className="text-meta" style={{ color: result.includes('found') && !result.includes('No') ? 'var(--success)' : 'var(--text-tertiary)' }}>
          {result}
        </span>
      )}
    </div>
  );
}
