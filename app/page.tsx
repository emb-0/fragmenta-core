import Link from "next/link";
import { getLibraryStats, getRandomHighlight } from "@/lib/supabase/db";

export default async function Home() {
  let stats = { bookCount: 0, highlightCount: 0, noteCount: 0 };
  let randomHighlight: Awaited<ReturnType<typeof getRandomHighlight>> = null;

  try {
    [stats, randomHighlight] = await Promise.all([
      getLibraryStats(),
      getRandomHighlight(),
    ]);
  } catch {
    // DB may not be connected yet
  }

  return (
    <div className="page-container" style={{ paddingTop: 'var(--sp-2xl)', paddingBottom: 'var(--sp-2xl)' }}>
      {/* Hero */}
      <div className="section-header" style={{ marginBottom: 'var(--sp-2xl)' }}>
        <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>Personal Library</p>
        <h1 className="text-display text-text-1" style={{ marginBottom: 'var(--sp-md)' }}>
          Your reading,<br />collected.
        </h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)', maxWidth: '480px', lineHeight: '1.6' }}>
          Import your Kindle highlights and build a searchable personal
          library of everything you&rsquo;ve marked, noted, and remembered.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3" style={{ marginBottom: 'var(--sp-2xl)' }}>
        <Link href="/import" className="btn-prominent">
          Import highlights
        </Link>
        <Link href="/library" className="btn-secondary">
          Browse library
        </Link>
        {stats.highlightCount > 0 && (
          <Link href="/random" className="btn-secondary">
            Random highlight
          </Link>
        )}
      </div>

      {/* Stats metrics */}
      {stats.bookCount > 0 && (
        <div
          className="surface-section flex gap-0"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <MetricCell label="Books" value={stats.bookCount} />
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <MetricCell label="Highlights" value={stats.highlightCount} />
          <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
          <MetricCell label="Notes" value={stats.noteCount} />
        </div>
      )}

      {/* Random highlight teaser */}
      {randomHighlight && (
        <div style={{ marginTop: 'var(--sp-xl)' }}>
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>From your library</p>
          <Link href={`/books/${randomHighlight.book.id}#h-${randomHighlight.id}`} className="block">
            <div className="surface-glass hover-lift" style={{ cursor: 'pointer' }}>
              <p className="text-narrative" style={{ position: 'relative', zIndex: 1 }}>
                &ldquo;{randomHighlight.text.length > 280
                  ? randomHighlight.text.slice(0, 280) + '...'
                  : randomHighlight.text}&rdquo;
              </p>
              <p className="text-meta" style={{ marginTop: 'var(--sp-md)', position: 'relative', zIndex: 1 }}>
                {randomHighlight.book.canonical_title}
                {randomHighlight.book.canonical_author && (
                  <span style={{ color: 'var(--text-tertiary)' }}> — {randomHighlight.book.canonical_author}</span>
                )}
              </p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 text-center" style={{ padding: 'var(--sp-lg) var(--sp-md)' }}>
      <p className="text-eyebrow" style={{ marginBottom: '4px' }}>{label}</p>
      <p className="text-section-title text-text-1">{value.toLocaleString()}</p>
    </div>
  );
}
