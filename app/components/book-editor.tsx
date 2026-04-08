"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BookEditorProps {
  bookId: string;
  title: string;
  author: string | null;
  highlightCount: number;
}

export function BookEditor({ bookId, title, author, highlightCount }: BookEditorProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit" | "delete" | "merge">("view");
  const [editTitle, setEditTitle] = useState(title);
  const [editAuthor, setEditAuthor] = useState(author || "");
  const [mergeId, setMergeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (editTitle.trim() !== title) payload.canonical_title = editTitle.trim();
      if ((editAuthor.trim() || null) !== author) payload.canonical_author = editAuthor.trim() || null;

      if (Object.keys(payload).length === 0) {
        setMode("view");
        return;
      }

      const res = await fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save");

      router.refresh();
      setMode("view");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete");
      router.push("/library");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setSaving(false);
    }
  }

  async function handleMerge() {
    const cleanId = mergeId.trim();
    if (!cleanId) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/books/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep_id: bookId, merge_id: cleanId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to merge");

      router.refresh();
      setMode("view");
      setMergeId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to merge");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditTitle(title);
    setEditAuthor(author || "");
    setMergeId("");
    setError(null);
    setMode("view");
  }

  if (mode === "view") {
    return (
      <div className="flex flex-wrap items-center gap-1" style={{ marginTop: "var(--sp-sm)" }}>
        <button onClick={() => setMode("edit")} className="btn-ghost" title="Edit book details">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
          </svg>
          Edit
        </button>
        <button onClick={() => setMode("merge")} className="btn-ghost" title="Merge another book into this one">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Merge
        </button>
        <button
          onClick={() => setMode("delete")}
          className="btn-ghost"
          title="Delete book"
          style={{ color: "var(--negative)" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5" />
            <path d="M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5L12.5 4" />
          </svg>
          Delete
        </button>
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div className="surface-inset flex flex-col gap-3" style={{ marginTop: "var(--sp-md)" }}>
        <div>
          <label className="text-eyebrow" style={{ display: "block", marginBottom: "4px" }}>Title</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="surface-field text-body-em"
            style={{
              width: "100%",
              outline: "none",
              border: "1px solid var(--accent)",
              color: "var(--text-primary)",
            }}
            disabled={saving}
          />
        </div>
        <div>
          <label className="text-eyebrow" style={{ display: "block", marginBottom: "4px" }}>Author</label>
          <input
            type="text"
            value={editAuthor}
            onChange={(e) => setEditAuthor(e.target.value)}
            className="surface-field text-body"
            placeholder="Unknown"
            style={{
              width: "100%",
              outline: "none",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
            }}
            disabled={saving}
          />
        </div>
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={saveEdit} disabled={saving || !editTitle.trim()} className="btn-ghost" style={{ color: "var(--accent)" }}>
            {saving ? "Saving..." : "Save changes"}
          </button>
          <button onClick={cancel} disabled={saving} className="btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="surface-inset flex flex-col gap-2" style={{ marginTop: "var(--sp-md)", borderColor: "var(--negative)" }}>
        <p className="text-body" style={{ color: "var(--negative)" }}>
          Delete &ldquo;{title}&rdquo; and all {highlightCount} highlight{highlightCount !== 1 ? "s" : ""}?
        </p>
        <p className="text-meta" style={{ color: "var(--text-tertiary)" }}>
          This action cannot be undone.
        </p>
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={saving} className="btn-ghost" style={{ color: "var(--negative)" }}>
            {saving ? "Deleting..." : "Yes, delete everything"}
          </button>
          <button onClick={cancel} disabled={saving} className="btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === "merge") {
    return (
      <div className="surface-inset flex flex-col gap-3" style={{ marginTop: "var(--sp-md)" }}>
        <p className="text-body" style={{ color: "var(--text-secondary)" }}>
          Merge another book&apos;s highlights into this one. The other book will be deleted.
        </p>
        <div>
          <label className="text-eyebrow" style={{ display: "block", marginBottom: "4px" }}>Book ID to merge in</label>
          <input
            type="text"
            value={mergeId}
            onChange={(e) => setMergeId(e.target.value)}
            className="surface-field text-body"
            placeholder="Paste book ID..."
            style={{
              width: "100%",
              outline: "none",
              border: "1px solid var(--border-default)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--font-meta)",
            }}
            disabled={saving}
          />
          <p className="text-meta" style={{ marginTop: "4px", color: "var(--text-tertiary)" }}>
            Find the book ID from the URL: /books/<strong>[id]</strong>
          </p>
        </div>
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleMerge} disabled={saving || !mergeId.trim()} className="btn-ghost" style={{ color: "var(--accent)" }}>
            {saving ? "Merging..." : "Merge"}
          </button>
          <button onClick={cancel} disabled={saving} className="btn-ghost">Cancel</button>
        </div>
      </div>
    );
  }

  return null;
}
