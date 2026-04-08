import Link from "next/link";
import { listBooks, type BookSortField } from "@/lib/supabase/db";

export const metadata = { title: "Library — Fragmenta" };

const sortOptions: { value: BookSortField; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "highlights", label: "Highlights" },
];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; has_notes?: string }>;
}) {
  const params = await searchParams;
  const sort = (params.sort || "recent") as BookSortField;
  const hasNotes = params.has_notes === "true";

  let books;
  try {
    books = await listBooks({ sort, hasNotes: hasNotes || undefined });
  } catch {
    return (
      <div className="page-container">
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Collection</p>
          <h1 className="text-large-title text-text-1">Library</h1>
        </div>
        <div className="surface-section" style={{ textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            Unable to connect to the database. Check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-xs)' }}>
          <p className="text-eyebrow">Collection</p>
          <div className="flex items-center gap-1">
            <Link href="/bookshelf" className="chip" style={{ fontSize: 'var(--font-chip)' }}>
              Shelf view
            </Link>
            <Link href="/import" className="chip" style={{ fontSize: 'var(--font-chip)' }}>
              + Import
            </Link>
          </div>
        </div>
        <h1 className="text-large-title text-text-1">Library</h1>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        {sortOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/library?sort=${opt.value}${hasNotes ? "&has_notes=true" : ""}`}
            className="chip"
            data-active={sort === opt.value}
          >
            {opt.label}
          </Link>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />
        <Link
          href={hasNotes ? `/library?sort=${sort}` : `/library?sort=${sort}&has_notes=true`}
          className="chip"
          data-active={hasNotes}
        >
          Has notes
        </Link>
      </div>

      {/* Count */}
      <p className="text-meta" style={{ marginBottom: 'var(--sp-md)', color: 'var(--text-tertiary)' }}>
        {books.length} {books.length === 1 ? "book" : "books"}
      </p>

      {/* Book list */}
      {books.length === 0 ? (
        <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: 'var(--sp-sm)' }}>
            No books yet.
          </p>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/import" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Import your Kindle highlights
            </Link>{" "}to get started.
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 'var(--sp-sm)' }}>
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="surface-journal hover-lift interactive block"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-card-title text-text-1" style={{ marginBottom: '2px' }}>
                    {book.canonical_title}
                  </h2>
                  {book.canonical_author && (
                    <p className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
                      {book.canonical_author}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0" style={{ marginTop: '4px' }}>
                  <span className="chip" style={{ cursor: 'default', pointerEvents: 'none' }}>
                    {book.highlight_count} highlights
                  </span>
                  {book.note_count > 0 && (
                    <span className="chip" style={{ cursor: 'default', pointerEvents: 'none', color: 'var(--accent-soft)' }}>
                      {book.note_count} notes
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
