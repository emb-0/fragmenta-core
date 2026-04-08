import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/client";
import { CollectionDetail } from "@/app/components/collection-detail";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createServerClient();
  const { data } = await supabase.from("collections").select("name").eq("id", id).single();
  if (!data) return { title: "Not Found — Fragmenta" };
  return { title: `${data.name} — Fragmenta` };
}

async function getCollectionWithBooks(id: string) {
  const supabase = createServerClient();

  const { data: collection, error } = await supabase
    .from("collections")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !collection) return null;

  const { data: joins } = await supabase
    .from("collection_books")
    .select("book_id, added_at, books!inner(id, canonical_title, canonical_author, highlight_count, note_count, cover_url, thumbnail_url)")
    .eq("collection_id", id)
    .order("added_at", { ascending: false });

  const books = (joins || []).map((j: Record<string, unknown>) => {
    const b = j.books as Record<string, unknown>;
    return {
      id: b.id as string,
      canonical_title: b.canonical_title as string,
      canonical_author: b.canonical_author as string | null,
      highlight_count: b.highlight_count as number,
      note_count: b.note_count as number,
      cover_url: b.cover_url as string | null,
      thumbnail_url: b.thumbnail_url as string | null,
      added_at: j.added_at as string,
    };
  });

  return {
    ...collection,
    books,
  };
}

export default async function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await getCollectionWithBooks(id);
  if (!collection) notFound();

  return (
    <div className="page-container">
      {/* Back nav */}
      <Link href="/collections" className="btn-ghost" style={{ marginLeft: "-8px", marginBottom: "var(--sp-md)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8L10 4" />
        </svg>
        Collections
      </Link>

      {/* Collection header */}
      <div className="surface-glass" style={{ marginBottom: "var(--sp-xl)" }}>
        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="text-eyebrow" style={{ marginBottom: "var(--sp-sm)" }}>Collection</p>
          <h1 className="text-display text-text-1" style={{ marginBottom: "var(--sp-xs)" }}>
            {collection.name}
          </h1>
          {collection.description && (
            <p className="text-body" style={{ color: "var(--text-secondary)" }}>
              {collection.description}
            </p>
          )}
          <p className="text-meta" style={{ marginTop: "var(--sp-sm)", color: "var(--text-tertiary)" }}>
            {collection.books.length} {collection.books.length === 1 ? "book" : "books"}
          </p>
        </div>
      </div>

      {/* Books in collection — client component for add/remove */}
      <CollectionDetail
        collectionId={collection.id}
        initialBooks={collection.books}
      />
    </div>
  );
}
