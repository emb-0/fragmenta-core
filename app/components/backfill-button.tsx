"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BackfillButtonProps {
  pendingCount: number;
}

export function BackfillButton({ pendingCount }: BackfillButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleBackfill() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/books/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backfill: true, limit: 50 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed');
      const d = json.data;
      setResult(`${d.enriched} enriched, ${d.notFound} not found${d.errors > 0 ? `, ${d.errors} errors` : ''}`);
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBackfill}
        disabled={loading}
        className="chip"
        style={{ color: 'var(--accent)', cursor: loading ? 'wait' : 'pointer' }}
      >
        {loading ? 'Enriching…' : `Enrich ${pendingCount} books`}
      </button>
      {result && (
        <span className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
          {result}
        </span>
      )}
    </div>
  );
}
