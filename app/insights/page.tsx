import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";

export const metadata = { title: "Insights — Fragmenta" };

// Direct queries for server component — avoid API round-trip
async function getInsightsData() {
  const supabase = createServerClient();

  // Parallel queries for speed
  const [
    { count: bookCount },
    { count: highlightCount },
    { count: noteCount },
    { count: coversCount },
    { data: topBooks },
    { data: recentHighlights },
    { data: activityRaw },
  ] = await Promise.all([
    supabase.from("books").select("*", { count: "exact", head: true }),
    supabase.from("highlights").select("*", { count: "exact", head: true }),
    supabase.from("highlights").select("*", { count: "exact", head: true }).not("note_text", "is", null),
    supabase.from("books").select("*", { count: "exact", head: true }).not("cover_url", "is", null),
    supabase.from("books").select("id, canonical_title, canonical_author, highlight_count, note_count, cover_url").order("highlight_count", { ascending: false }).limit(10),
    supabase.from("highlights").select("id, text, note_text, created_at, books!inner(id, canonical_title, canonical_author)").order("created_at", { ascending: false }).limit(5),
    supabase.rpc("get_activity_timeline" as never).select("*"),
  ]);

  // If RPC doesn't exist, fall back to basic stats
  let activity: Array<{ month: string; highlights: number }> = [];
  if (activityRaw && Array.isArray(activityRaw)) {
    activity = activityRaw as Array<{ month: string; highlights: number }>;
  }

  return {
    bookCount: bookCount || 0,
    highlightCount: highlightCount || 0,
    noteCount: noteCount || 0,
    coversCount: coversCount || 0,
    avgPerBook: bookCount ? Math.round((highlightCount || 0) / bookCount) : 0,
    topBooks: (topBooks || []) as Array<{ id: string; canonical_title: string; canonical_author: string | null; highlight_count: number; note_count: number; cover_url: string | null }>,
    recentHighlights: (recentHighlights || []) as Array<Record<string, unknown>>,
    activity,
  };
}

export default async function InsightsPage() {
  let data;
  try {
    data = await getInsightsData();
  } catch {
    return (
      <div className="page-container">
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: "var(--sp-xs)" }}>Reading</p>
          <h1 className="text-large-title text-text-1">Insights</h1>
        </div>
        <div className="surface-section" style={{ textAlign: "center" }}>
          <p className="text-body" style={{ color: "var(--text-tertiary)" }}>Unable to load insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <p className="text-eyebrow" style={{ marginBottom: "var(--sp-xs)" }}>Reading</p>
        <h1 className="text-large-title text-text-1">Insights</h1>
      </div>

      {/* Overview stats */}
      <div className="stats-grid" style={{ marginBottom: "var(--sp-xl)" }}>
        <div className="surface-journal text-center">
          <p className="text-display text-text-1">{data.bookCount}</p>
          <p className="text-eyebrow">Books</p>
        </div>
        <div className="surface-journal text-center">
          <p className="text-display text-text-1">{data.highlightCount}</p>
          <p className="text-eyebrow">Highlights</p>
        </div>
        <div className="surface-journal text-center">
          <p className="text-display text-text-1">{data.noteCount}</p>
          <p className="text-eyebrow">Notes</p>
        </div>
        <div className="surface-journal text-center">
          <p className="text-display text-text-1">{data.avgPerBook}</p>
          <p className="text-eyebrow">Avg per book</p>
        </div>
      </div>

      {/* Most annotated books */}
      {data.topBooks.length > 0 && (
        <div style={{ marginBottom: "var(--sp-xl)" }}>
          <h2 className="text-section-title text-text-1" style={{ marginBottom: "var(--sp-md)" }}>
            Most annotated
          </h2>
          <div className="flex flex-col" style={{ gap: "var(--sp-sm)" }}>
            {data.topBooks.map((book, i) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="surface-section interactive block"
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="text-card-title"
                    style={{
                      color: i < 3 ? "var(--accent)" : "var(--text-tertiary)",
                      minWidth: 28,
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body-em text-text-1" style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {book.canonical_title}
                    </p>
                    {book.canonical_author && (
                      <p className="text-meta" style={{ color: "var(--text-tertiary)" }}>
                        {book.canonical_author}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="chip" style={{ cursor: "default", pointerEvents: "none" }}>
                      {book.highlight_count}
                    </span>
                    {book.note_count > 0 && (
                      <span className="chip" style={{ cursor: "default", pointerEvents: "none", color: "var(--accent-soft)" }}>
                        {book.note_count} notes
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent highlights */}
      {data.recentHighlights.length > 0 && (
        <div style={{ marginBottom: "var(--sp-xl)" }}>
          <h2 className="text-section-title text-text-1" style={{ marginBottom: "var(--sp-md)" }}>
            Recently added
          </h2>
          <div className="flex flex-col" style={{ gap: "var(--sp-sm)" }}>
            {data.recentHighlights.map((r) => {
              const books = r.books as Record<string, unknown>;
              return (
                <Link
                  key={r.id as string}
                  href={`/books/${books.id}#h-${r.id}`}
                  className="surface-journal interactive block"
                  style={{ textDecoration: "none" }}
                >
                  <p className="text-narrative" style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontSize: "var(--font-body)",
                  }}>
                    {r.text as string}
                  </p>
                  <p className="text-meta" style={{ marginTop: "var(--sp-xs)", color: "var(--text-tertiary)" }}>
                    {books.canonical_title as string}
                    {books.canonical_author ? ` — ${books.canonical_author as string}` : ''}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/library" className="chip">Library</Link>
        <Link href="/bookshelf" className="chip">Bookshelf</Link>
        <Link href="/collections" className="chip">Collections</Link>
        <Link href="/import" className="chip" style={{ color: "var(--accent)" }}>+ Import</Link>
      </div>
    </div>
  );
}
