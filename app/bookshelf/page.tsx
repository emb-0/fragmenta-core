import Link from "next/link";
import { listBooksForShelf, type BookSortField } from "@/lib/supabase/db";
import { BookCover } from "@/app/components/book-cover";
import { BackfillButton } from "@/app/components/backfill-button";

export const metadata = { title: "Bookshelf — Fragmenta" };

const sortOptions: { value: BookSortField; label: string }[] = [
  { value: "recent", label: "Recent" },
  { value: "title", label: "Title" },
  { value: "author", label: "Author" },
  { value: "highlights", label: "Highlights" },
];

export default async function BookshelfPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; covers_only?: string }>;
}) {
  const params = await searchParams;
  const sort = (params.sort || "recent") as BookSortField;
  const coversOnly = params.covers_only === "true";

  let books;
  try {
    books = await listBooksForShelf({ sort, hasCovers: coversOnly || undefined });
  } catch {
    return (
      <div className="page-container">
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Collection</p>
          <h1 className="text-large-title text-text-1">Bookshelf</h1>
        </div>
        <div className="surface-section" style={{ textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            Unable to connect to the database.
          </p>
        </div>
      </div>
    );
  }

  const enrichedCount = books.filter((b) => b.cover_url).length;
  const pendingCount = books.filter(
    (b) => b.enrichment_status === 'pending' || b.enrichment_status === null,
  ).length;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-xs)' }}>
          <p className="text-eyebrow">Collection</p>
          <Link href="/library" className="chip" style={{ fontSize: 'var(--font-chip)' }}>
            List view
          </Link>
        </div>
        <h1 className="text-large-title text-text-1">Bookshelf</h1>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 'var(--sp-lg)' }}>
        {sortOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/bookshelf?sort=${opt.value}${coversOnly ? "&covers_only=true" : ""}`}
            className="chip"
            data-active={sort === opt.value}
          >
            {opt.label}
          </Link>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)', margin: '0 4px' }} />
        <Link
          href={coversOnly ? `/bookshelf?sort=${sort}` : `/bookshelf?sort=${sort}&covers_only=true`}
          className="chip"
          data-active={coversOnly}
        >
          Covers only
        </Link>
      </div>

      {/* Stats + backfill */}
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-lg)' }}>
        <p className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
          {books.length} {books.length === 1 ? 'book' : 'books'}
          {enrichedCount > 0 && ` · ${enrichedCount} with covers`}
        </p>
        {pendingCount > 0 && (
          <BackfillButton pendingCount={pendingCount} />
        )}
      </div>

      {/* Book grid */}
      {books.length === 0 ? (
        <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: 'var(--sp-sm)' }}>
            {coversOnly ? 'No books with covers yet.' : 'No books yet.'}
          </p>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            {coversOnly ? (
              <Link href={`/bookshelf?sort=${sort}`} style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Show all books
              </Link>
            ) : (
              <Link href="/import" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                Import your Kindle highlights
              </Link>
            )}{" "}to get started.
          </p>
        </div>
      ) : (
        <div className="bookshelf-grid">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="bookshelf-item interactive"
              style={{ textDecoration: 'none' }}
            >
              <BookCover
                title={book.canonical_title}
                author={book.canonical_author}
                coverUrl={book.cover_url}
                thumbnailUrl={book.thumbnail_url}
                size="md"
              />
              <div className="bookshelf-item-meta">
                <p className="text-meta text-text-1" style={{
                  fontWeight: 600,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.3,
                }}>
                  {book.canonical_title}
                </p>
                {book.canonical_author && (
                  <p className="text-meta" style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    {book.canonical_author}
                  </p>
                )}
                <p className="text-meta" style={{ color: 'var(--text-tertiary)', marginTop: '4px', fontSize: 'var(--font-chip)' }}>
                  {book.highlight_count} highlight{book.highlight_count !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
