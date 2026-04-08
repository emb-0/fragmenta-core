import Link from "next/link";
import { createServerClient } from "@/lib/supabase/client";
import { CollectionManager } from "@/app/components/collection-manager";

export const metadata = { title: "Collections — Fragmenta" };

async function getCollections() {
  const supabase = createServerClient();

  const { data: collections, error } = await supabase
    .from("collections")
    .select("*, collection_books(count)")
    .order("name");

  if (error) throw error;

  return (collections || []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | null,
    created_at: c.created_at as string,
    updated_at: c.updated_at as string,
    book_count: ((c.collection_books as Array<{ count: number }>)?.[0]?.count) || 0,
  }));
}

export default async function CollectionsPage() {
  let collections;
  try {
    collections = await getCollections();
  } catch {
    return (
      <div className="page-container">
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: "var(--sp-xs)" }}>Organize</p>
          <h1 className="text-large-title text-text-1">Collections</h1>
        </div>
        <div className="surface-section" style={{ textAlign: "center" }}>
          <p className="text-body" style={{ color: "var(--text-tertiary)" }}>Unable to load collections.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between" style={{ marginBottom: "var(--sp-xs)" }}>
          <p className="text-eyebrow">Organize</p>
          <Link href="/library" className="chip" style={{ fontSize: "var(--font-chip)" }}>
            Library
          </Link>
        </div>
        <h1 className="text-large-title text-text-1">Collections</h1>
      </div>

      {/* Create + manage collections (client component) */}
      <CollectionManager initialCollections={collections} />
    </div>
  );
}
