import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, getHighlightsForBook } from "@/lib/supabase/db";
import { CopyButton } from "@/app/components/copy-button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await getBook(id);
  if (!book) return { title: "Not Found — Fragmenta" };
  return { title: `${book.canonical_title} — Fragmenta` };
}

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; has_notes?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const sort = (sp.sort || "sequence") as "sequence" | "recent";
  const hasNotes = sp.has_notes === "true";

  const book = await getBook(id);
  if (!book) notFound();

  const { highlights, total } = await getHighlightsForBook(id, {
    limit: 500,
    sort,
    hasNotes: hasNotes || undefined,
  });

  return (
    <div className="page-container">
      {/* Back nav */}
      <Link
        href="/library"
        className="btn-ghost"
        style={{ marginLeft: '-8px', marginBottom: 'var(--sp-md)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8L10 4" />
        </svg>
        Library
      </Link>

      {/* Book hero */}
      <div className="surface-glass" style={{ marginBottom: 'var(--sp-xl)', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>Book</p>
          <h1 className="text-display text-text-1" style={{ marginBottom: 'var(--sp-xs)' }}>
            {book.canonical_title}
          </h1>
          {book.canonical_author && (
            <p className="text-body-em" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-lg)' }}>
              {book.canonical_author}
            </p>
          )}

          {/* Metrics row */}
          <div className="flex gap-3">
            <div className="surface-inset flex-1 text-center">
              <p className="text-eyebrow" style={{ marginBottom: '2px' }}>Highlights</p>
              <p className="text-card-title text-text-1">{total}</p>
            </div>
            {book.note_count > 0 && (
              <div className="surface-inset flex-1 text-center">
                <p className="text-eyebrow" style={{ marginBottom: '2px' }}>Notes</p>
                <p className="text-card-title text-text-1">{book.note_count}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        <Link
          href={`/books/${id}?sort=sequence${hasNotes ? "&has_notes=true" : ""}`}
          className="chip"
          data-active={sort === "sequence"}
        >
          Original order
        </Link>
        <Link
          href={`/books/${id}?sort=recent${hasNotes ? "&has_notes=true" : ""}`}
          className="chip"
          data-active={sort === "recent"}
        >
          Recent first
        </Link>
        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />
        <Link
          href={hasNotes ? `/books/${id}?sort=${sort}` : `/books/${id}?sort=${sort}&has_notes=true`}
          className="chip"
          data-active={hasNotes}
        >
          Notes only
        </Link>
        <div className="flex-1" />
        <a
          href={`/api/exports/markdown?book_id=${id}`}
          className="chip"
          style={{ color: 'var(--accent)' }}
        >
          Export
        </a>
      </div>

      {/* Highlights */}
      {highlights.length === 0 ? (
        <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            No highlights match your filters.
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 'var(--sp-md)' }}>
          {highlights.map((h, idx) => (
            <div
              key={h.id}
              id={`h-${h.id}`}
              className="surface-journal group"
              style={{ scrollMarginTop: '80px' }}
            >
              {/* Sequence number */}
              <div className="flex items-start justify-between" style={{ marginBottom: 'var(--sp-sm)' }}>
                <span className="text-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                  {sort === "sequence" ? `#${h.sequence_number || idx + 1}` : ''}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={h.text} />
                </span>
              </div>

              {/* Highlight text */}
              <p className="text-narrative" style={{ whiteSpace: 'pre-wrap' }}>
                {h.text}
              </p>

              {/* Note */}
              {h.note_text && (
                <div className="surface-inset" style={{ marginTop: 'var(--sp-md)' }}>
                  <p className="text-eyebrow" style={{ marginBottom: '4px', color: 'var(--accent-soft)' }}>Note</p>
                  <p className="text-body" style={{ color: 'var(--text-secondary)' }}>{h.note_text}</p>
                </div>
              )}

              {/* Metadata */}
              {h.source_location && (
                <p className="text-meta" style={{ marginTop: 'var(--sp-sm)', color: 'var(--text-tertiary)', fontSize: 'var(--font-chip)' }}>
                  {h.source_location}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
