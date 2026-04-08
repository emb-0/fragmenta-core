import Link from "next/link";
import { listImports } from "@/lib/supabase/db";

export const metadata = { title: "Import History — Fragmenta" };

export default async function ImportsPage() {
  let imports;
  try {
    imports = await listImports();
  } catch {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight mb-6">Import History</h1>
        <p className="text-muted">Unable to connect to the database.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Import History</h1>
        <Link href="/import" className="text-sm text-muted hover:text-foreground transition-colors">
          + New import
        </Link>
      </div>

      {imports.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-muted text-lg">No imports yet.</p>
          <p className="text-muted text-sm">
            <Link href="/import" className="underline hover:text-foreground">Import your first Kindle highlights</Link>.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {imports.map((imp) => {
            const summary = imp.import_summary;
            const status = imp.parse_status;
            const statusColor = status === "completed" ? "bg-green-500" : status === "failed" ? "bg-red-500" : "bg-amber-500";

            return (
              <Link
                key={imp.id}
                href={`/imports/${imp.id}`}
                className="block px-4 py-3.5 -mx-4 rounded-lg hover:bg-surface transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
                      <span className="font-medium text-sm">
                        {imp.filename || `Import ${imp.id.slice(0, 8)}`}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-1 flex gap-3">
                      <span>{imp.source_type}</span>
                      {summary && (
                        <>
                          <span>{summary.books_found || 0} books</span>
                          <span>{summary.highlights_created || 0} highlights</span>
                          {(summary.highlights_skipped_duplicate || 0) > 0 && (
                            <span>{summary.highlights_skipped_duplicate} dupes</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {new Date(imp.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
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
