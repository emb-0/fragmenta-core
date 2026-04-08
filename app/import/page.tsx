import { ImportForm } from "@/app/components/import-form";

export const metadata = {
  title: "Import — Fragmenta",
};

export default function ImportPage() {
  return (
    <div className="page-container">
      <div className="section-header">
        <p className="text-eyebrow" style={{ marginBottom: 'var(--sp-xs)' }}>Add to Library</p>
        <h1 className="text-large-title text-text-1" style={{ marginBottom: 'var(--sp-sm)' }}>
          Import highlights
        </h1>
        <p className="text-body" style={{ color: 'var(--text-secondary)' }}>
          Upload your Kindle highlights export or paste the text directly.
          Supports both <span style={{ color: 'var(--text-primary)' }}>My Clippings.txt</span> and{" "}
          <span style={{ color: 'var(--text-primary)' }}>Kindle notebook</span> formats.
        </p>
      </div>

      <ImportForm />
    </div>
  );
}
