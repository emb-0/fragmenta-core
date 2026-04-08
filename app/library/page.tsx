import Link from "next/link";
import { listBooks, type BookSortField } from "@/lib/supabase/db";
import { SearchBar } from "@/app/components/search-bar";

export const metadata = { title: "Library — Fragmenta" };

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
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Library</h1>
        <p className="text-muted">Unable to connect to the database. Check your environment variables.</p>
      </div>
    );
  }

  const sortOptions: { value: BookSortField; label: string }[] = [
    { value: "recent", label: "Recently imported" },
    { value: "title", label: "Title" },
    { value: "author", label: "Author" },
    { value: "highlights", label: "Most highlights" },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
        <Link href="/import" className="text-sm text-muted hover:text-foreground transition-colors">
          + Import
        </Link>
      </div>

      <SearchBar />

      {/* Sort/filter bar */}
      <div className="flex items-center gap-4 mt-6 mb-4 text-xs text-muted">
        <span>Sort:</span>
        {sortOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/library?sort=${opt.value}${hasNotes ? "&has_notes=true" : ""}`}
            className={`hover:text-foreground transition-colors ${sort === opt.value ? "text-foreground font-medium" : ""}`}
          >
            {opt.label}
          </Link>
        ))}
        <span className="ml-2">|</span>
        <Link
          href={hasNotes ? `/library?sort=${sort}` : `/library?sort=${sort}&has_notes=true`}
          className={`hover:text-foreground transition-colors ${hasNotes ? "text-foreground font-medium" : ""}`}
        >
          {hasNotes ? "All books" : "Has notes"}
        </Link>
      </div>

      <p className="text-xs text-muted mb-4">
        {books.length} {books.length === 1 ? "book" : "books"}
      </p>

      {books.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted text-lg">No books yet.</p>
          <p className="text-muted text-sm">
            <Link href="/import" className="underline hover:text-foreground">Import your Kindle highlights</Link> to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {books.map((book) => (
            <Link
              key={book.id}
              href={`/books/${book.id}`}
              className="block px-4 py-3.5 -mx-4 rounded-lg hover:bg-surface transition-colors group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-medium text-foreground group-hover:text-accent truncate">
                    {book.canonical_title}
                  </h2>
                  {book.canonical_author && (
                    <p className="text-sm text-muted mt-0.5">{book.canonical_author}</p>
                  )}
                </div>
                <div className="text-right text-xs text-muted whitespace-nowrap mt-1 space-y-0.5">
                  <div>{book.highlight_count} highlights</div>
                  {book.note_count > 0 && <div>{book.note_count} notes</div>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
