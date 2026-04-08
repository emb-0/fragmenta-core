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
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/library" className="text-sm text-muted hover:text-foreground transition-colors">
        &larr; Library
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">{book.canonical_title}</h1>
        {book.canonical_author && <p className="text-muted mt-1">{book.canonical_author}</p>}
        <div className="flex items-center gap-4 mt-2 text-sm text-muted">
          <span>{total} highlights</span>
          {book.note_count > 0 && <span>{book.note_count} notes</span>}
        </div>
      </div>

      {/* Sort/filter */}
      <div className="flex items-center gap-4 mb-6 text-xs text-muted">
        <span>Sort:</span>
        <Link
          href={`/books/${id}?sort=sequence${hasNotes ? "&has_notes=true" : ""}`}
          className={`hover:text-foreground ${sort === "sequence" ? "text-foreground font-medium" : ""}`}
        >
          Order
        </Link>
        <Link
          href={`/books/${id}?sort=recent${hasNotes ? "&has_notes=true" : ""}`}
          className={`hover:text-foreground ${sort === "recent" ? "text-foreground font-medium" : ""}`}
        >
          Recent
        </Link>
        <span>|</span>
        <Link
          href={hasNotes ? `/books/${id}?sort=${sort}` : `/books/${id}?sort=${sort}&has_notes=true`}
          className={`hover:text-foreground ${hasNotes ? "text-foreground font-medium" : ""}`}
        >
          {hasNotes ? "All" : "Notes only"}
        </Link>
        <span className="ml-auto">
          <a
            href={`/api/exports/markdown?book_id=${id}`}
            className="hover:text-foreground transition-colors"
          >
            Export
          </a>
        </span>
      </div>

      {highlights.length === 0 ? (
        <p className="text-muted py-8 text-center">No highlights match your filters.</p>
      ) : (
        <div className="space-y-6">
          {highlights.map((h) => (
            <div key={h.id} id={`h-${h.id}`} className="border-l-2 border-border pl-5 py-1 group">
              <p className="font-serif text-base leading-relaxed whitespace-pre-wrap">{h.text}</p>
              {h.note_text && (
                <p className="text-sm text-muted mt-2 italic">Note: {h.note_text}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                {h.source_location && <span className="text-xs text-muted">{h.source_location}</span>}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <CopyButton text={h.text} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
