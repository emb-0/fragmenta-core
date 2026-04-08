"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ImportState = "idle" | "previewing" | "previewed" | "importing" | "success" | "error";

interface BookPreview {
  title: string;
  author: string | null;
  highlight_count: number;
  note_count: number;
  vocab_count: number;
}

interface PreviewData {
  format: string;
  books_detected: number;
  highlights_detected: number;
  notes_detected: number;
  vocab_detected: number;
  parse_warnings_count: number;
  warnings: string[];
  books: BookPreview[];
}

interface ImportResult {
  import_id: string;
  summary: {
    format: string;
    books_found: number;
    books_created: number;
    books_existing: number;
    highlights_found: number;
    highlights_created: number;
    highlights_skipped_duplicate: number;
    notes_found: number;
    vocab_found: number;
    warnings: string[];
  };
}

export function ImportForm() {
  const [state, setState] = useState<ImportState>("idle");
  const [text, setText] = useState("");
  const [filename, setFilename] = useState<string>("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // The raw text or file to import — stored for the commit step
  const pendingFileRef = useRef<File | null>(null);

  async function handlePreview(source: "paste" | "file", file?: File) {
    setState("previewing");
    setErrorMsg("");

    try {
      let res: Response;
      if (source === "file" && file) {
        pendingFileRef.current = file;
        setFilename(file.name);
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/imports/kindle/preview", { method: "POST", body: formData });
        // Also read the text for potential paste-commit later
        setText(await file.text());
      } else {
        pendingFileRef.current = null;
        res = await fetch("/api/imports/kindle/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }

      const json = await res.json();
      if (json.error) {
        setState("error");
        setErrorMsg(json.error.message);
      } else {
        setPreview(json.data);
        setState("previewed");
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleCommitImport() {
    setState("importing");
    setErrorMsg("");

    try {
      let res: Response;
      if (pendingFileRef.current) {
        const formData = new FormData();
        formData.append("file", pendingFileRef.current);
        res = await fetch("/api/imports/kindle", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/imports/kindle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, filename: filename || undefined }),
        });
      }

      const json = await res.json();
      if (json.error) {
        setState("error");
        setErrorMsg(json.error.message);
      } else {
        setState("success");
        setResult(json.data);
      }
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  function reset() {
    setState("idle");
    setText("");
    setFilename("");
    setPreview(null);
    setResult(null);
    setErrorMsg("");
    pendingFileRef.current = null;
  }

  // Success view
  if (state === "success" && result) {
    const s = result.summary;
    return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <h2 className="font-semibold text-lg">Import complete</h2>
          </div>
          <p className="text-xs text-muted">Format: {s.format} &middot; Import ID: {result.import_id.slice(0, 8)}&hellip;</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Books found" value={s.books_found} />
            <Stat label="New books" value={s.books_created} />
            <Stat label="Existing books" value={s.books_existing} />
            <Stat label="Highlights found" value={s.highlights_found} />
            <Stat label="New highlights" value={s.highlights_created} />
            <Stat label="Duplicates skipped" value={s.highlights_skipped_duplicate} />
            {s.notes_found > 0 && <Stat label="Notes" value={s.notes_found} />}
          </div>
          {s.warnings.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium">{s.warnings.length} warnings</summary>
              <ul className="mt-2 list-disc pl-4 space-y-1 max-h-40 overflow-y-auto">
                {s.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => router.push("/library")} className="btn-primary">View library</button>
          <button onClick={() => router.push(`/imports/${result.import_id}`)} className="btn-secondary">View import details</button>
          <button onClick={reset} className="btn-secondary">Import more</button>
        </div>
      </div>
    );
  }

  // Preview view
  if ((state === "previewed" || state === "importing") && preview) {
    return (
      <div className="space-y-6">
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="font-semibold text-lg">Import preview</h2>
          </div>
          <p className="text-xs text-muted">
            Format detected: <strong>{preview.format}</strong>
            {filename && <> &middot; File: {filename}</>}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <Stat label="Books" value={preview.books_detected} />
            <Stat label="Highlights" value={preview.highlights_detected} />
            <Stat label="Notes" value={preview.notes_detected} />
            {preview.vocab_detected > 0 && <Stat label="Vocabulary" value={preview.vocab_detected} />}
            {preview.parse_warnings_count > 0 && <Stat label="Warnings" value={preview.parse_warnings_count} />}
          </div>

          {preview.books.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Books to import</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {preview.books.map((b, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1">
                    <div className="min-w-0">
                      <span className="font-medium truncate">{b.title}</span>
                      {b.author && <span className="text-muted ml-1">— {b.author}</span>}
                    </div>
                    <span className="text-xs text-muted whitespace-nowrap ml-3">
                      {b.highlight_count}h{b.note_count > 0 && ` ${b.note_count}n`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer font-medium">{preview.warnings.length} warnings</summary>
              <ul className="mt-2 list-disc pl-4 space-y-1 max-h-40 overflow-y-auto">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </details>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCommitImport}
            disabled={state === "importing"}
            className="btn-primary"
          >
            {state === "importing" ? "Importing..." : "Confirm import"}
          </button>
          <button onClick={reset} className="btn-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  // Input view
  return (
    <div className="space-y-8">
      {/* File upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Upload file</label>
        <div
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-muted transition-colors"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handlePreview("file", file);
          }}
        >
          <p className="text-muted text-sm">
            Drop your Kindle highlights file here, or click to browse
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".txt"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePreview("file", file);
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted">or paste text</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Paste area */}
      <div>
        <label className="block text-sm font-medium mb-2" htmlFor="paste-area">
          Paste highlights
        </label>
        <textarea
          id="paste-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste your Kindle highlights here...\n\nSupports both My Clippings.txt and Kindle notebook exports."}
          rows={12}
          className="w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm font-mono placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted">
            {text.length > 0 ? `${text.length.toLocaleString()} characters` : ""}
          </p>
          <button
            onClick={() => handlePreview("paste")}
            disabled={state === "previewing" || !text.trim()}
            className="btn-primary"
          >
            {state === "previewing" ? "Analyzing..." : "Preview import"}
          </button>
        </div>
      </div>

      {state === "error" && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <span className="text-muted">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}
