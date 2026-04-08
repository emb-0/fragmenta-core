"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookCover } from "./book-cover";

interface CollectionBook {
  id: string;
  canonical_title: string;
  canonical_author: string | null;
  highlight_count: number;
  note_count: number;
  cover_url: string | null;
  thumbnail_url: string | null;
  added_at: string;
}

interface CollectionDetailProps {
  collectionId: string;
  initialBooks: CollectionBook[];
}

export function CollectionDetail({ collectionId, initialBooks }: CollectionDetailProps) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [addingBook, setAddingBook] = useState(false);
  const [bookIdInput, setBookIdInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAddBook() {
    const id = bookIdInput.trim();
    if (!id) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ book_id: id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed");
      setBookIdInput("");
      setAddingBook(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveBook(bookId: string) {
    try {
      await fetch(`/api/collections/${collectionId}/books/${bookId}`, { method: "DELETE" });
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch {
      router.refresh();
    }
  }

  return (
    <div>
      {/* Add book */}
      {!addingBook ? (
        <button
          onClick={() => setAddingBook(true)}
          className="btn-ghost"
          style={{ color: "var(--accent)", marginBottom: "var(--sp-lg)" }}
        >
          + Add book
        </button>
      ) : (
        <div className="surface-inset flex flex-col gap-2" style={{ marginBottom: "var(--sp-lg)" }}>
          <input
            type="text"
            value={bookIdInput}
            onChange={(e) => setBookIdInput(e.target.value)}
            placeholder="Paste book ID from URL: /books/[id]"
            className="surface-field text-body"
            style={{ width: "100%", outline: "none", fontFamily: "var(--font-mono)", fontSize: "var(--font-meta)", color: "var(--text-secondary)" }}
            autoFocus
          />
          {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleAddBook} disabled={saving || !bookIdInput.trim()} className="btn-ghost" style={{ color: "var(--accent)" }}>
              {saving ? "Adding…" : "Add"}
            </button>
            <button onClick={() => { setAddingBook(false); setError(null); }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* Book list */}
      {books.length === 0 ? (
        <div className="surface-section" style={{ textAlign: "center", padding: "var(--sp-2xl) var(--sp-lg)" }}>
          <p className="text-body" style={{ color: "var(--text-tertiary)" }}>
            No books in this collection yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: "var(--sp-sm)" }}>
          {books.map((book) => (
            <div key={book.id} className="surface-journal hover-lift group" style={{ position: "relative" }}>
              <Link href={`/books/${book.id}`} className="block" style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-3">
                  <BookCover
                    title={book.canonical_title}
                    author={book.canonical_author}
                    coverUrl={book.cover_url}
                    thumbnailUrl={book.thumbnail_url}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-card-title text-text-1">{book.canonical_title}</h2>
                    {book.canonical_author && (
                      <p className="text-meta" style={{ color: "var(--text-tertiary)" }}>{book.canonical_author}</p>
                    )}
                    <p className="text-meta" style={{ color: "var(--text-tertiary)", marginTop: "2px", fontSize: "var(--font-chip)" }}>
                      {book.highlight_count} highlights
                    </p>
                  </div>
                </div>
              </Link>
              <button
                onClick={() => handleRemoveBook(book.id)}
                className="btn-ghost opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ position: "absolute", top: 12, right: 12, color: "var(--negative)" }}
                title="Remove from collection"
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 8h8" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
