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
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
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

  // =========================================================================
  // Success view
  // =========================================================================
  if (state === "success" && result) {
    const s = result.summary;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
        <div className="surface-glass">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-md)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
              <h2 className="text-section-title text-text-1">Import complete</h2>
            </div>
            <p className="text-meta" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-md)' }}>
              Format: {s.format} &middot; Import ID: {result.import_id.slice(0, 8)}&hellip;
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 'var(--sp-sm)',
              }}
            >
              <StatCard label="Books found" value={s.books_found} />
              <StatCard label="New books" value={s.books_created} />
              <StatCard label="Existing" value={s.books_existing} />
              <StatCard label="Highlights" value={s.highlights_found} />
              <StatCard label="New highlights" value={s.highlights_created} />
              <StatCard label="Duplicates" value={s.highlights_skipped_duplicate} />
              {s.notes_found > 0 && <StatCard label="Notes" value={s.notes_found} />}
            </div>

            {s.warnings.length > 0 && (
              <details style={{ marginTop: 'var(--sp-md)' }}>
                <summary className="text-meta" style={{ cursor: 'pointer', color: 'var(--warning)' }}>
                  {s.warnings.length} warnings
                </summary>
                <div style={{ marginTop: 'var(--sp-sm)', maxHeight: '160px', overflowY: 'auto' }}>
                  {s.warnings.map((w, i) => (
                    <p key={i} className="text-meta" style={{ color: 'var(--text-tertiary)', marginBottom: '2px' }}>{w}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => router.push("/library")} className="btn-prominent">View library</button>
          <button onClick={() => router.push(`/imports/${result.import_id}`)} className="btn-secondary">View details</button>
          <button onClick={reset} className="btn-secondary">Import more</button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Preview view
  // =========================================================================
  if ((state === "previewed" || state === "importing") && preview) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-lg)' }}>
        <div className="surface-section">
          <div className="flex items-center gap-2" style={{ marginBottom: 'var(--sp-md)' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--warning)' }} />
            <h2 className="text-section-title text-text-1">Preview</h2>
          </div>
          <p className="text-meta" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-md)' }}>
            Format: <strong style={{ color: 'var(--text-primary)' }}>{preview.format}</strong>
            {filename && <> &middot; {filename}</>}
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 'var(--sp-sm)',
              marginBottom: 'var(--sp-lg)',
            }}
          >
            <StatCard label="Books" value={preview.books_detected} />
            <StatCard label="Highlights" value={preview.highlights_detected} />
            <StatCard label="Notes" value={preview.notes_detected} />
            {preview.vocab_detected > 0 && <StatCard label="Vocabulary" value={preview.vocab_detected} />}
            {preview.parse_warnings_count > 0 && <StatCard label="Warnings" value={preview.parse_warnings_count} />}
          </div>

          {/* Book list */}
          {preview.books.length > 0 && (
            <div>
              <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>Books to import</p>
              <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {preview.books.map((b, i) => (
                  <div key={i} className="surface-inset flex items-center justify-between">
                    <div className="min-w-0">
                      <span className="text-body-em text-text-1" style={{ fontSize: 'var(--font-sub)' }}>{b.title}</span>
                      {b.author && <span className="text-meta" style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>— {b.author}</span>}
                    </div>
                    <span className="text-chip-label" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                      {b.highlight_count}h{b.note_count > 0 && ` ${b.note_count}n`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <details style={{ marginTop: 'var(--sp-md)' }}>
              <summary className="text-meta" style={{ cursor: 'pointer', color: 'var(--warning)' }}>
                {preview.warnings.length} warnings
              </summary>
              <div style={{ marginTop: 'var(--sp-sm)', maxHeight: '160px', overflowY: 'auto' }}>
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-meta" style={{ color: 'var(--text-tertiary)', marginBottom: '2px' }}>{w}</p>
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCommitImport}
            disabled={state === "importing"}
            className="btn-prominent"
          >
            {state === "importing" ? "Importing..." : "Confirm import"}
          </button>
          <button onClick={reset} className="btn-secondary">Cancel</button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // Input view
  // =========================================================================
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-xl)' }}>
      {/* File upload */}
      <div
        className={`surface-section interactive`}
        style={{
          textAlign: 'center',
          padding: 'var(--sp-2xl) var(--sp-lg)',
          cursor: 'pointer',
          borderStyle: 'dashed',
          borderWidth: '2px',
          borderColor: dragOver ? 'var(--accent)' : undefined,
          background: dragOver ? 'rgba(109, 138, 168, 0.06)' : undefined,
          transition: 'all 0.2s ease',
        }}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handlePreview("file", file);
        }}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ margin: '0 auto var(--sp-md)' }}
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-body-em text-text-2" style={{ marginBottom: '4px' }}>
          Drop your Kindle highlights file here
        </p>
        <p className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
          or click to browse
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".txt"
          className="hidden"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handlePreview("file", file);
          }}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1" style={{ height: '1px', background: 'var(--border-subtle)' }} />
        <span className="text-eyebrow" style={{ textTransform: 'lowercase', letterSpacing: 'normal', fontWeight: 400 }}>or paste text</span>
        <div className="flex-1" style={{ height: '1px', background: 'var(--border-subtle)' }} />
      </div>

      {/* Paste area */}
      <div>
        <label className="text-eyebrow" htmlFor="paste-area" style={{ display: 'block', marginBottom: 'var(--sp-sm)' }}>
          Paste highlights
        </label>
        <textarea
          id="paste-area"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Paste your Kindle highlights here...\n\nSupports both My Clippings.txt and Kindle notebook exports."}
          rows={10}
          className="surface-field"
          style={{
            width: '100%',
            resize: 'vertical',
            fontFamily: 'var(--font-serif)',
            fontSize: 'var(--font-body)',
            lineHeight: '1.7',
            color: 'var(--text-primary)',
            minHeight: '200px',
            outline: 'none',
          }}
        />
        <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-sm)' }}>
          <p className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
            {text.length > 0 ? `${text.length.toLocaleString()} characters` : ""}
          </p>
          <button
            onClick={() => handlePreview("paste")}
            disabled={state === "previewing" || !text.trim()}
            className="btn-prominent"
          >
            {state === "previewing" ? "Analyzing..." : "Preview import"}
          </button>
        </div>
      </div>

      {/* Error */}
      {state === "error" && (
        <div
          className="surface-inset"
          style={{
            borderColor: 'rgba(208, 108, 99, 0.3)',
            background: 'rgba(208, 108, 99, 0.08)',
          }}
        >
          <p className="text-body" style={{ color: 'var(--negative)' }}>{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-inset text-center">
      <p className="text-eyebrow" style={{ marginBottom: '2px' }}>{label}</p>
      <p className="text-body-em text-text-1">{value}</p>
    </div>
  );
}
