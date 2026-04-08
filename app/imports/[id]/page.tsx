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
  const statusColor = status === "completed" ? "text-green-600" : status === "failed" ? "text-red-600" : "text-amber-600";

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <Link href="/imports" className="text-sm text-muted hover:text-foreground transition-colors">
        &larr; Import History
      </Link>

      <div className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {imp.filename || `Import ${imp.id.slice(0, 8)}`}
        </h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-muted">
          <span className={statusColor}>{status}</span>
          <span>{imp.source_type}</span>
          <span>{new Date(imp.created_at).toLocaleString()}</span>
        </div>
      </div>

      {summary && (
        <div className="bg-surface border border-border rounded-lg p-6 space-y-4 mb-8">
          <h2 className="font-medium">Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {summary.format && <Stat label="Format" value={summary.format} />}
            <Stat label="Books found" value={summary.books_found} />
            <Stat label="New books" value={summary.books_created} />
            <Stat label="Existing books" value={summary.books_existing} />
            <Stat label="Highlights found" value={summary.highlights_found} />
            <Stat label="New highlights" value={summary.highlights_created} />
            <Stat label="Duplicates skipped" value={summary.highlights_skipped_duplicate} />
            {(summary.notes_found || 0) > 0 && <Stat label="Notes" value={summary.notes_found} />}
            {(summary.vocab_found || 0) > 0 && <Stat label="Vocabulary" value={summary.vocab_found} />}
          </div>
        </div>
      )}

      {imp.error_message && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-8">
          <h2 className="font-medium text-red-700 dark:text-red-300 text-sm mb-1">Error</h2>
          <p className="text-sm text-red-600 dark:text-red-400">{imp.error_message}</p>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h2 className="font-medium mb-3">{warnings.length} Warnings</h2>
          <ul className="text-sm text-muted space-y-1 list-disc pl-4 max-h-60 overflow-y-auto">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-xs text-muted">
        <p>Import ID: {imp.id}</p>
        <p>Raw text: {imp.raw_text.length.toLocaleString()} characters</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-sm">
      <span className="text-muted">{label}:</span>{" "}
      <span className="font-medium">{value}</span>
    </div>
  );
}
