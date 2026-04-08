"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CopyButton } from "./copy-button";
import { HighlightEditor } from "./highlight-editor";

interface HighlightData {
  id: string;
  sequence_number: number;
  text: string;
  note_text: string | null;
  source_location: string | null;
}

interface HighlightListProps {
  initialHighlights: HighlightData[];
  bookTitle: string;
  bookAuthor: string | null;
  sort: "sequence" | "recent";
}

export function HighlightList({ initialHighlights, bookTitle, bookAuthor, sort }: HighlightListProps) {
  const router = useRouter();
  const [highlights, setHighlights] = useState(initialHighlights);

  function handleUpdated(id: string, updated: { text: string; note_text: string | null }) {
    setHighlights((prev) =>
      prev.map((h) => (h.id === id ? { ...h, text: updated.text, note_text: updated.note_text } : h))
    );
  }

  function handleDeleted(id: string) {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
    // Refresh server data to update counts
    router.refresh();
  }

  const citation = bookAuthor ? `${bookTitle} — ${bookAuthor}` : bookTitle;

  if (highlights.length === 0) {
    return (
      <div className="surface-section" style={{ textAlign: "center", padding: "var(--sp-2xl) var(--sp-lg)" }}>
        <p className="text-body" style={{ color: "var(--text-tertiary)" }}>
          No highlights match your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ gap: "var(--sp-md)" }}>
      {highlights.map((h, idx) => (
        <div
          key={h.id}
          id={`h-${h.id}`}
          className="surface-journal group"
          style={{ scrollMarginTop: "80px" }}
        >
          {/* Header row: sequence number + toolbar */}
          <div className="flex items-start justify-between" style={{ marginBottom: "var(--sp-sm)" }}>
            <span className="text-eyebrow" style={{ color: "var(--text-tertiary)" }}>
              {sort === "sequence" ? `#${h.sequence_number || idx + 1}` : ""}
            </span>
            <span className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
              <CopyButton text={h.text} citation={citation} />
              <HighlightEditor
                highlightId={h.id}
                text={h.text}
                noteText={h.note_text}
                onUpdated={(updated) => handleUpdated(h.id, updated)}
                onDeleted={() => handleDeleted(h.id)}
              />
            </span>
          </div>

          {/* Highlight text */}
          <p className="text-narrative" style={{ whiteSpace: "pre-wrap" }}>
            {h.text}
          </p>

          {/* Note */}
          {h.note_text && (
            <div className="surface-inset" style={{ marginTop: "var(--sp-md)" }}>
              <p className="text-eyebrow" style={{ marginBottom: "4px", color: "var(--accent-soft)" }}>Note</p>
              <p className="text-body" style={{ color: "var(--text-secondary)" }}>{h.note_text}</p>
            </div>
          )}

          {/* Metadata */}
          {h.source_location && (
            <p
              className="text-meta"
              style={{
                marginTop: "var(--sp-sm)",
                color: "var(--text-tertiary)",
                fontSize: "var(--font-chip)",
              }}
            >
              {h.source_location}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
