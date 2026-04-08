import Link from "next/link";
import { notFound } from "next/navigation";
import { getBook, getHighlightsForBook } from "@/lib/supabase/db";
import { BookEditor } from "@/app/components/book-editor";
import { BookCover } from "@/app/components/book-cover";
import { EnrichButton } from "@/app/components/enrich-button";
import { HighlightList } from "@/app/components/highlight-list";

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

  // Serialize highlights for the client component
  const clientHighlights = highlights.map((h) => ({
    id: h.id,
    sequence_number: h.sequence_number,
    text: h.text,
    note_text: h.note_text,
    source_location: h.source_location,
  }));

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

      {/* Book hero with cover */}
      <div className="surface-glass" style={{ marginBottom: 'var(--sp-xl)', position: 'relative' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex gap-4" style={{ alignItems: 'flex-start' }}>
            {/* Cover art */}
            <div className="shrink-0" style={{ marginTop: '4px' }}>
              <BookCover
                title={book.canonical_title}
                author={book.canonical_author}
                coverUrl={book.cover_url}
                thumbnailUrl={book.thumbnail_url}
                size="sm"
              />
            </div>

            {/* Book info */}
            <div className="min-w-0 flex-1">
              <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Book</p>
              <h1 className="text-display text-text-1" style={{ marginBottom: 'var(--sp-xs)' }}>
                {book.canonical_title}
              </h1>
              {book.subtitle && (
                <p className="text-body" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-xs)', fontStyle: 'italic' }}>
                  {book.subtitle}
                </p>
              )}
              {book.canonical_author && (
                <p className="text-body-em" style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-xs)' }}>
                  {book.canonical_author}
                </p>
              )}

              {/* Extra metadata from enrichment */}
              {(book.publisher || book.published_date || book.page_count) && (
                <p className="text-meta" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-xs)' }}>
                  {[
                    book.publisher,
                    book.published_date,
                    book.page_count ? `${book.page_count} pages` : null,
                  ].filter(Boolean).join(' · ')}
                </p>
              )}

              {/* Actions row */}
              <div className="flex flex-wrap items-center gap-1" style={{ marginTop: 'var(--sp-xs)' }}>
                <BookEditor
                  bookId={book.id}
                  title={book.canonical_title}
                  author={book.canonical_author}
                  highlightCount={book.highlight_count}
                />
                <EnrichButton
                  bookId={book.id}
                  enrichmentStatus={book.enrichment_status}
                />
              </div>
            </div>
          </div>

          {/* Metrics row */}
          <div className="flex gap-3" style={{ marginTop: 'var(--sp-lg)' }}>
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

      {/* Highlights — client component with inline editing */}
      <HighlightList
        initialHighlights={clientHighlights}
        bookTitle={book.canonical_title}
        bookAuthor={book.canonical_author}
        sort={sort}
      />
    </div>
  );
}
