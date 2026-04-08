"use client";

import { useState, useRef, useEffect } from "react";

interface HighlightEditorProps {
  highlightId: string;
  text: string;
  noteText: string | null;
  onUpdated: (updated: { text: string; note_text: string | null }) => void;
  onDeleted: () => void;
}

export function HighlightEditor({
  highlightId,
  text,
  noteText,
  onUpdated,
  onDeleted,
}: HighlightEditorProps) {
  const [mode, setMode] = useState<"view" | "edit-text" | "edit-note" | "confirm-delete">("view");
  const [editText, setEditText] = useState(text);
  const [editNote, setEditNote] = useState(noteText || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (mode === "edit-text" && textRef.current) {
      textRef.current.focus();
      textRef.current.style.height = "auto";
      textRef.current.style.height = textRef.current.scrollHeight + "px";
    }
    if (mode === "edit-note" && noteRef.current) {
      noteRef.current.focus();
      noteRef.current.style.height = "auto";
      noteRef.current.style.height = noteRef.current.scrollHeight + "px";
    }
  }, [mode]);

  async function save(field: "text" | "note_text") {
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (field === "text") payload.text = editText;
      if (field === "note_text") payload.note_text = editNote.trim() || null;

      const res = await fetch(`/api/highlights/${highlightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to save");

      onUpdated({ text: json.data.text, note_text: json.data.note_text });
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
      const res = await fetch(`/api/highlights/${highlightId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || "Failed to delete");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
      setSaving(false);
    }
  }

  function cancel() {
    setEditText(text);
    setEditNote(noteText || "");
    setError(null);
    setMode("view");
  }

  // Toolbar shown on hover (view mode)
  if (mode === "view") {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => setMode("edit-text")}
          className="btn-ghost"
          title="Edit highlight"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" />
          </svg>
          Edit
        </button>
        <button
          onClick={() => setMode("edit-note")}
          className="btn-ghost"
          title={noteText ? "Edit note" : "Add note"}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 8H8M14 4H2M14 12H2" />
          </svg>
          {noteText ? "Note" : "+ Note"}
        </button>
        <button
          onClick={() => setMode("confirm-delete")}
          className="btn-ghost"
          title="Delete highlight"
          style={{ color: "var(--negative)" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 4h12M5 4V2.5A.5.5 0 015.5 2h5a.5.5 0 01.5.5V4M6 7v5M10 7v5" />
            <path d="M3.5 4l.5 9.5a1 1 0 001 .5h6a1 1 0 001-.5L12.5 4" />
          </svg>
        </button>
      </div>
    );
  }

  // Confirm delete
  if (mode === "confirm-delete") {
    return (
      <div className="flex flex-col gap-2" style={{ padding: "var(--sp-sm) 0" }}>
        <p className="text-meta" style={{ color: "var(--negative)" }}>
          Delete this highlight permanently?
        </p>
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleDelete} disabled={saving} className="btn-ghost" style={{ color: "var(--negative)" }}>
            {saving ? "Deleting..." : "Yes, delete"}
          </button>
          <button onClick={cancel} disabled={saving} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Edit text mode
  if (mode === "edit-text") {
    return (
      <div className="flex flex-col gap-2" style={{ marginTop: "var(--sp-sm)" }}>
        <textarea
          ref={textRef}
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          className="surface-field text-narrative"
          style={{
            width: "100%",
            resize: "none",
            minHeight: "80px",
            overflow: "hidden",
            outline: "none",
            border: "1px solid var(--accent)",
          }}
          disabled={saving}
        />
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => save("text")} disabled={saving || !editText.trim()} className="btn-ghost" style={{ color: "var(--accent)" }}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button onClick={cancel} disabled={saving} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Edit note mode
  if (mode === "edit-note") {
    return (
      <div className="flex flex-col gap-2" style={{ marginTop: "var(--sp-sm)" }}>
        <p className="text-eyebrow" style={{ color: "var(--accent-soft)" }}>
          {noteText ? "Edit note" : "Add note"}
        </p>
        <textarea
          ref={noteRef}
          value={editNote}
          onChange={(e) => {
            setEditNote(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          placeholder="Add a note..."
          className="surface-field text-body"
          style={{
            width: "100%",
            resize: "none",
            minHeight: "60px",
            overflow: "hidden",
            outline: "none",
            border: "1px solid var(--accent-soft)",
            color: "var(--text-secondary)",
          }}
          disabled={saving}
        />
        {error && <p className="text-meta" style={{ color: "var(--negative)" }}>{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => save("note_text")} disabled={saving} className="btn-ghost" style={{ color: "var(--accent)" }}>
            {saving ? "Saving..." : "Save note"}
          </button>
          {noteText && (
            <button
              onClick={() => { setEditNote(""); save("note_text"); }}
              disabled={saving}
              className="btn-ghost"
              style={{ color: "var(--negative)" }}
            >
              Remove note
            </button>
          )}
          <button onClick={cancel} disabled={saving} className="btn-ghost">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return null;
}
