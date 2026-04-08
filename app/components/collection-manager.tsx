"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CollectionItem {
  id: string;
  name: string;
  description: string | null;
  book_count: number;
}

interface CollectionManagerProps {
  initialCollections: CollectionItem[];
}

export function CollectionManager({ initialCollections }: CollectionManagerProps) {
  const router = useRouter();
  const [collections, setCollections] = useState(initialCollections);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setCollections((prev) => [...prev, { ...json.data, book_count: 0 }]);
      setNewName("");
      setNewDesc("");
      setCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this collection?")) return;
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      setCollections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // Silent — will refresh
      router.refresh();
    }
  }

  return (
    <div>
      {/* Create button */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          className="btn-prominent"
          style={{ marginBottom: "var(--sp-lg)" }}
        >
          + New collection
        </button>
      ) : (
        <div className="surface-inset flex flex-col gap-3" style={{ marginBottom: "var(--sp-lg)" }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Collection name"
            className="surface-field text-body-em"
            style={{ width: "100%", outline: "none", color: "var(--text-primary)" }}
            autoFocus
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="surface-field text-body"
            style={{ width: "100%", outline: "none", color: "var(--text-secondary)" }}
          />
          {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving || !newName.trim()} className="btn-ghost" style={{ color: "var(--accent)" }}>
              {saving ? "Creating…" : "Create"}
            </button>
            <button onClick={() => { setCreating(false); setError(null); }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Collection list */}
      {collections.length === 0 && !creating ? (
        <div className="surface-section" style={{ textAlign: "center", padding: "var(--sp-2xl) var(--sp-lg)" }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: "var(--sp-sm)" }}>
            No collections yet.
          </p>
          <p className="text-body" style={{ color: "var(--text-tertiary)" }}>
            Create a collection to organize your books.
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--sp-sm)" }}>
          {collections.map((c) => (
            <div key={c.id} className="surface-journal hover-lift group" style={{ position: "relative" }}>
              <Link
                href={`/collections/${c.id}`}
                className="block"
                style={{ textDecoration: "none" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-card-title text-text-1">{c.name}</h2>
                    {c.description && (
                      <p className="text-meta" style={{ color: "var(--text-tertiary)", marginTop: "2px" }}>
                        {c.description}
                      </p>
                    )}
                  </div>
                  <span className="chip" style={{ cursor: "default", pointerEvents: "none" }}>
                    {c.book_count} {c.book_count === 1 ? "book" : "books"}
                  </span>
                </div>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ position: "absolute", top: 12, right: 12, color: "var(--negative)" }}
                title="Delete collection"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5" />
                  <path d="M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5L12.5 4" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
