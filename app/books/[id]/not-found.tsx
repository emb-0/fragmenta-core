import Link from "next/link";

export default function BookNotFound() {
  return (
    <div className="page-container" style={{ paddingTop: 'var(--sp-2xl)' }}>
      <div className="surface-section" style={{ textAlign: 'center', padding: 'var(--sp-2xl) var(--sp-lg)' }}>
        <p className="text-section-title text-text-1" style={{ marginBottom: 'var(--sp-sm)' }}>
          Book not found
        </p>
        <p className="text-body" style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--sp-lg)' }}>
          This book doesn&apos;t exist or may have been merged.
        </p>
        <Link href="/library" className="btn-prominent">
          Back to library
        </Link>
      </div>
    </div>
  );
}
