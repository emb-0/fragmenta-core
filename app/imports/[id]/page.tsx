import Link from "next/link";
import { notFound } from "next/navigation";
import { getImport } from "@/lib/supabase/db";
import type { ImportSummary } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `Import ${id.slice(0, 8)} — Fragmenta` };
}

export default async function ImportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const imp = await getImport(id);
  if (!imp) notFound();

  const summary: ImportSummary | null = imp.import_summary || null;
  const warnings = summary?.warnings || [];
  const status = imp.parse_status;

  const statusConfig = {
    completed: { color: 'var(--success)', label: 'Completed' },
    failed: { color: 'var(--negative)', label: 'Failed' },
    processing: { color: 'var(--warning)', label: 'Processing' },
    pending: { color: 'var(--warning)', label: 'Pending' },
  }[status] || { color: 'var(--text-tertiary)', label: status };

  return (
    <div className="page-container">
      {/* Back nav */}
      <Link
        href="/imports"
        className="btn-ghost"
        style={{ marginLeft: '-8px', marginBottom: 'var(--sp-md)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 12L6 8L10 4" />
        </svg>
        History
      </Link>

      {/* Header */}
      <div className="surface-glass" style={{ marginBottom: 'var(--sp-xl)' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>Import Detail</p>
          <h1 className="text-section-title text-text-1" style={{ marginBottom: 'var(--sp-xs)' }}>
            {imp.filename || `Import ${imp.id.slice(0, 8)}`}
          </h1>
          <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 'var(--sp-sm)' }}>
            <span className="chip" style={{ cursor: 'default', pointerEvents: 'none' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: statusConfig.color,
                  display: 'inline-block',
                }}
              />
              {statusConfig.label}
            </span>
            <span className="chip" style={{ cursor: 'default', pointerEvents: 'none' }}>
              {imp.source_type === 'kindle_notebook' ? 'Notebook' : 'Clippings'}
            </span>
            <span className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
              {new Date(imp.created_at).toLocaleString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="surface-section" style={{ marginBottom: 'var(--sp-lg)' }}>
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-md)' }}>Summary</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 'var(--sp-sm)',
            }}
          >
            {summary.format && <StatCard label="Format" value={summary.format} />}
            <StatCard label="Books found" value={summary.books_found} />
            <StatCard label="New books" value={summary.books_created} />
            <StatCard label="Existing books" value={summary.books_existing} />
            <StatCard label="Highlights found" value={summary.highlights_found} />
            <StatCard label="New highlights" value={summary.highlights_created} />
            <StatCard label="Duplicates skipped" value={summary.highlights_skipped_duplicate} />
            {(summary.notes_found || 0) > 0 && <StatCard label="Notes" value={summary.notes_found} />}
            {(summary.vocab_found || 0) > 0 && <StatCard label="Vocabulary" value={summary.vocab_found} />}
          </div>
        </div>
      )}

      {/* Error */}
      {imp.error_message && (
        <div
          className="surface-inset"
          style={{
            marginBottom: 'var(--sp-lg)',
            borderColor: 'rgba(208, 108, 99, 0.3)',
            background: 'rgba(208, 108, 99, 0.08)',
          }}
        >
          <p className="text-eyebrow" style={{ marginBottom: '4px', color: 'var(--negative)' }}>Error</p>
          <p className="text-body" style={{ color: 'var(--negative)' }}>{imp.error_message}</p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="surface-section" style={{ marginBottom: 'var(--sp-lg)' }}>
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-sm)' }}>
            {warnings.length} Warnings
          </p>
          <div
            style={{
              maxHeight: '240px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {warnings.map((w, i) => (
              <p key={i} className="text-meta" style={{ color: 'var(--warning)' }}>
                {w}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="surface-inset">
        <div className="flex flex-wrap gap-4">
          <div>
            <p className="text-eyebrow" style={{ marginBottom: '2px' }}>Import ID</p>
            <p className="text-meta" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>{imp.id}</p>
          </div>
          <div>
            <p className="text-eyebrow" style={{ marginBottom: '2px' }}>Raw text</p>
            <p className="text-meta" style={{ color: 'var(--text-tertiary)' }}>{imp.raw_text.length.toLocaleString()} characters</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface-inset text-center">
      <p className="text-eyebrow" style={{ marginBottom: '2px' }}>{label}</p>
      <p className="text-body-em text-text-1">{value}</p>
    </div>
  );
}
