import Link from "next/link";
import { searchHighlights, searchBooks } from "@/lib/supabase/db";
import { SearchBar } from "@/app/components/search-bar";

export const metadata = { title: "Search — Fragmenta" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; has_notes?: string; book_id?: string; offset?: string }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const sort = (params.sort || "relevance") as "relevance" | "recent" | "book";
  const hasNotes = params.has_notes === "true" || undefined;
  const bookId = params.book_id || undefined;
  const offset = parseInt(params.offset || "0", 10);
  const limit = 50;

  let highlightResults: Awaited<ReturnType<typeof searchHighlights>> | null = null;
  let bookResults: Awaited<ReturnType<typeof searchBooks>> | null = null;

  if (q.trim()) {
    [highlightResults, bookResults] = await Promise.all([
      searchHighlights(q, { limit, offset, bookId, hasNotes, sort }),
      offset === 0 ? searchBooks(q) : Promise.resolve([]),
    ]);
  }

  const sortOptions = [
    { value: "relevance" as const, label: "Relevance" },
    { value: "recent" as const, label: "Recent" },
    { value: "book" as const, label: "By book" },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Discover</p>
        <h1 className="text-large-title text-text-1">Search</h1>
      </div>

      {/* Search input */}
      <SearchBar initialQuery={q} />

      {/* Results */}
      {q.trim() && highlightResults ? (
        <div style={{ marginTop: 'var(--sp-xl)' }}>
          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'var(--sp-lg)' }}>
            {sortOptions.map((s) => (
              <Link
                key={s.value}
                href={`/search?q=${encodeURIComponent(q)}&sort=${s.value}${hasNotes ? "&has_notes=true" : ""}${bookId ? `&book_id=${bookId}` : ""}`}
                className="chip"
                data-active={sort === s.value}
              >
                {s.label}
              </Link>
            ))}
            <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />
            <Link
              href={`/search?q=${encodeURIComponent(q)}&sort=${sort}${hasNotes ? "" : "&has_notes=true"}${bookId ? `&book_id=${bookId}` : ""}`}
              className="chip"
              data-active={!!hasNotes}
            >
              Notes only
            </Link>
          </div>

          {/* Book matches */}
          {bookResults && bookResults.length > 0 && (
            <div style={{ marginBottom: 'var(--sp-lg)' }}>
              <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>Matching books</p>
              <div className="flex flex-wrap gap-2">
                {bookResults.map((b) => (
                  <Link
                    key={b.id}
                    href={`/books/${b.id}`}
                    className="chip hover-lift"
                    style={{ color: 'var(--accent)' }}
                  >
                    {b.canonical_title}
                    {b.canonical_author && (
                      <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}> — {b.canonical_author}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Result count */}
          <p className="text-meta" style={{ marginBottom: 'var(--sp-md)', color: 'var(--text-tertiary)' }}>
            {highlightResults.total} highlight{highlightResults.total !== 1 ? "s" : ""} found
            {offset > 0 && ` (${offset + 1}–${Math.min(offset + limit, highlightResults.total)})`}
          </p>

          {/* Highlight results */}
          {highlightResults.results.length === 0 ? (
            <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
              <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
                No highlights found for &ldquo;{q}&rdquo;
              </p>
            </div>
          ) : (
            <div className="flex flex-col" style={{ gap: 'var(--sp-sm)' }}>
              {highlightResults.results.map((r) => (
                <Link
                  key={r.highlight.id}
                  href={`/books/${r.book.id}#h-${r.highlight.id}`}
                  className="surface-journal interactive block"
                  style={{ textDecoration: 'none' }}
                >
                  <p
                    className="text-narrative"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      fontSize: 'var(--font-body)',
                    }}
                  >
                    {r.highlight.text}
                  </p>
                  {r.highlight.note_text && (
                    <p className="text-meta" style={{ marginTop: 'var(--sp-xs)', color: 'var(--accent-soft)', fontStyle: 'italic' }}>
                      Note: {r.highlight.note_text.length > 80 ? r.highlight.note_text.slice(0, 80) + '...' : r.highlight.note_text}
                    </p>
                  )}
                  <p className="text-meta" style={{ marginTop: 'var(--sp-sm)', color: 'var(--text-tertiary)' }}>
                    {r.book.canonical_title}
                    {r.book.canonical_author && ` — ${r.book.canonical_author}`}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {highlightResults.total > limit && (
            <div className="flex items-center gap-3" style={{ marginTop: 'var(--sp-xl)' }}>
              {offset > 0 && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&sort=${sort}&offset=${Math.max(0, offset - limit)}${hasNotes ? "&has_notes=true" : ""}`}
                  className="btn-secondary"
                >
                  Previous
                </Link>
              )}
              <span className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(highlightResults.total / limit)}
              </span>
              {offset + limit < highlightResults.total && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&sort=${sort}&offset=${offset + limit}${hasNotes ? "&has_notes=true" : ""}`}
                  className="btn-secondary"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      ) : !q.trim() ? (
        <div className="surface-section" style={{ textAlign: 'center', marginTop: 'var(--sp-xl)', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: 'var(--sp-xs)' }}>
            Search your entire library
          </p>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            Highlights, notes, book titles, and authors.
          </p>
        </div>
      ) : null}
    </div>
  );
}
