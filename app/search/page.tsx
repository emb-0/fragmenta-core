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

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Search</h1>

      <SearchBar initialQuery={q} />

      {q.trim() && highlightResults && (
        <div className="mt-8">
          {/* Sort controls */}
          <div className="flex items-center gap-4 mb-4 text-xs text-muted">
            <span>Sort:</span>
            {(["relevance", "recent", "book"] as const).map((s) => (
              <Link
                key={s}
                href={`/search?q=${encodeURIComponent(q)}&sort=${s}${hasNotes ? "&has_notes=true" : ""}${bookId ? `&book_id=${bookId}` : ""}`}
                className={`hover:text-foreground ${sort === s ? "text-foreground font-medium" : ""}`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Link>
            ))}
            <span>|</span>
            <Link
              href={`/search?q=${encodeURIComponent(q)}&sort=${sort}${hasNotes ? "" : "&has_notes=true"}${bookId ? `&book_id=${bookId}` : ""}`}
              className={`hover:text-foreground ${hasNotes ? "text-foreground font-medium" : ""}`}
            >
              {hasNotes ? "All" : "Notes only"}
            </Link>
          </div>

          {/* Book matches */}
          {bookResults && bookResults.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-medium text-muted uppercase tracking-wide mb-2">Matching books</h2>
              <div className="flex flex-wrap gap-2">
                {bookResults.map((b) => (
                  <Link
                    key={b.id}
                    href={`/books/${b.id}`}
                    className="text-sm px-3 py-1.5 bg-surface border border-border rounded-md hover:border-accent transition-colors"
                  >
                    {b.canonical_title}
                    {b.canonical_author && <span className="text-muted"> — {b.canonical_author}</span>}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Highlight matches */}
          <p className="text-xs text-muted mb-4">
            {highlightResults.total} highlight{highlightResults.total !== 1 ? "s" : ""} found
            {offset > 0 && ` (showing ${offset + 1}–${Math.min(offset + limit, highlightResults.total)})`}
          </p>

          {highlightResults.results.length === 0 ? (
            <p className="text-muted text-sm py-8 text-center">
              No highlights found for &ldquo;{q}&rdquo;
            </p>
          ) : (
            <div className="space-y-4">
              {highlightResults.results.map((r) => (
                <Link
                  key={r.highlight.id}
                  href={`/books/${r.book.id}#h-${r.highlight.id}`}
                  className="block border-l-2 border-border pl-4 py-2 hover:border-accent transition-colors"
                >
                  <p className="text-sm font-serif leading-relaxed line-clamp-3">
                    {r.highlight.text}
                  </p>
                  {r.highlight.note_text && (
                    <p className="text-xs text-muted mt-1 italic line-clamp-1">
                      Note: {r.highlight.note_text}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-1">
                    {r.book.canonical_title}
                    {r.book.canonical_author && ` — ${r.book.canonical_author}`}
                  </p>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {highlightResults.total > limit && (
            <div className="flex items-center gap-4 mt-8 text-sm">
              {offset > 0 && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&sort=${sort}&offset=${Math.max(0, offset - limit)}${hasNotes ? "&has_notes=true" : ""}`}
                  className="text-muted hover:text-foreground"
                >
                  &larr; Previous
                </Link>
              )}
              {offset + limit < highlightResults.total && (
                <Link
                  href={`/search?q=${encodeURIComponent(q)}&sort=${sort}&offset=${offset + limit}${hasNotes ? "&has_notes=true" : ""}`}
                  className="text-muted hover:text-foreground"
                >
                  Next &rarr;
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {!q.trim() && (
        <p className="text-muted text-sm mt-8 text-center">
          Search across all your highlights, notes, book titles, and authors.
        </p>
      )}
    </div>
  );
}
