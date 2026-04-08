import { ImportForm } from "@/app/components/import-form";

export const metadata = {
  title: "Import — Fragmenta",
};

export default function ImportPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">
        Import highlights
      </h1>
      <p className="text-muted mb-8">
        Paste your Kindle highlights export or upload the <code className="text-xs bg-surface px-1.5 py-0.5 rounded border border-border">My Clippings.txt</code> file.
      </p>

      <ImportForm />
    </div>
  );
}
