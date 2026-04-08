import Link from "next/link";
import { listImports } from "@/lib/supabase/db";

export const metadata = { title: "Import History — Fragmenta" };

export default async function ImportsPage() {
  let imports;
  try {
    imports = await listImports();
  } catch {
    return (
      <div className="page-container">
        <div className="section-header">
          <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Archive</p>
          <h1 className="text-large-title text-text-1">Import History</h1>
        </div>
        <div className="surface-section" style={{ textAlign: 'center' }}>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>Unable to connect to the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="section-header">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--sp-xs)' }}>
          <p className="text-eyebrow">Archive</p>
          <Link href="/import" className="chip" style={{ fontSize: 'var(--font-chip)' }}>
            + New import
          </Link>
        </div>
        <h1 className="text-large-title text-text-1">Import History</h1>
      </div>

      {imports.length === 0 ? (
        <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
          <p className="text-body-em text-text-2" style={{ marginBottom: 'var(--sp-sm)' }}>
            No imports yet.
          </p>
          <p className="text-body" style={{ color: 'var(--text-tertiary)' }}>
            <Link href="/import" style={{ color: 'var(--accent)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Import your first Kindle highlights
            </Link>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 'var(--sp-sm)' }}>
          {imports.map((imp) => {
            const summary = imp.import_summary;
            const status = imp.parse_status;

            const statusConfig = {
              completed: { color: 'var(--success)', label: 'Completed' },
              failed: { color: 'var(--negative)', label: 'Failed' },
              processing: { color: 'var(--warning)', label: 'Processing' },
              pending: { color: 'var(--warning)', label: 'Pending' },
            }[status] || { color: 'var(--text-tertiary)', label: status };

            return (
              <Link
                key={imp.id}
                href={`/imports/${imp.id}`}
                className="surface-journal interactive block"
                style={{ textDecoration: 'none' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2" style={{ marginBottom: '4px' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: statusConfig.color,
                          flexShrink: 0,
                        }}
                      />
                      <span className="text-card-title text-text-1" style={{ fontSize: 'var(--font-body-em)' }}>
                        {imp.filename || `Import ${imp.id.slice(0, 8)}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" style={{ marginTop: 'var(--sp-xs)' }}>
                      <span className="chip" style={{ cursor: 'default', pointerEvents: 'none', fontSize: 'var(--font-eyebrow)' }}>
                        {imp.source_type === 'kindle_notebook' ? 'Notebook' : 'Clippings'}
                      </span>
                      {summary && (
                        <>
                          <span className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
                            {summary.books_found || 0} books
                          </span>
                          <span className="text-meta" style={{ color: 'var(--text-tertiary)' }}>
                            {summary.highlights_created || 0} highlights
                          </span>
                          {(summary.highlights_skipped_duplicate || 0) > 0 && (
                            <span className="text-meta" style={{ color: 'var(--warning)' }}>
                              {summary.highlights_skipped_duplicate} dupes
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-meta" style={{ color: 'var(--text-tertiary)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {new Date(imp.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
