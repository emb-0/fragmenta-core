import Link from "next/link";
import { getRandomHighlight } from "@/lib/supabase/db";
import { CopyButton } from "@/app/components/copy-button";

export const metadata = { title: "Random Highlight — Fragmenta" };

// Always fetch fresh
export const dynamic = "force-dynamic";

export default async function RandomHighlightPage() {
  let highlight: Awaited<ReturnType<typeof getRandomHighlight>> = null;

  try {
    highlight = await getRandomHighlight();
  } catch {
    // DB error
  }

  if (!highlight) {
    return (
      <div className="page-container" style={{ paddingTop: 'var(--sp-2xl)' }}>
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Discovery</p>
          <h1 className="text-large-title text-text-1">Random Highlight</h1>
        </div>
        <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: 'var(--sp-sm)' }}>
            No highlights in your library yet.
          </p>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/import" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Import some Kindle highlights
            </Link>{" "}to discover them here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: 'var(--sp-2xl)' }}>
      <div className="section-header" style={{ marginBottom: 'var(--sp-xl)' }}>
        <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Discovery</p>
        <h1 className="text-large-title text-text-1">Random Highlight</h1>
      </div>

      {/* The highlight */}
      <div className="surface-glass" style={{ marginBottom: 'var(--sp-xl)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="text-narrative" style={{ marginBottom: 'var(--sp-lg)', whiteSpace: 'pre-wrap' }}>
            &ldquo;{highlight.text}&rdquo;
          </p>

          {highlight.note_text && (
            <div className="surface-inset" style={{ marginBottom: 'var(--sp-lg)' }}>
              <p className="text-eyebrow" style={{ marginBottom: '4px', color: 'var(--accent-soft)' }}>Note</p>
              <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{highlight.note_text}</p>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link
              href={`/books/${highlight.book.id}`}
              className="text-meta"
              style={{ color: 'var(--accent)', textDecoration: 'none' }}
            >
              {highlight.book.canonical_title}
              {highlight.book.canonical_author && (
                <span style={{ color: 'var(--text-tertiary)' }}> — {highlight.book.canonical_author}</span>
              )}
            </Link>
            <CopyButton text={highlight.text} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href="/random" className="btn-prominent">
          Another one
        </Link>
        <Link
          href={`/books/${highlight.book.id}#h-${highlight.id}`}
          className="btn-secondary"
        >
          View in context
        </Link>
      </div>
    </div>
  );
}
