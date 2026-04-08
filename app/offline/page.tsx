"use client";

export default function OfflinePage() {
  return (
    <div className="page-container" style={{ textAlign: "center", paddingTop: "var(--sp-2xl)" }}>
      <div className="surface-glass" style={{ maxWidth: 400, margin: "0 auto", padding: "var(--sp-2xl)" }}>
        <p style={{ fontSize: "2.5rem", marginBottom: "var(--sp-md)" }}>📖</p>
        <h1 className="text-large-title text-text-1" style={{ marginBottom: "var(--sp-sm)" }}>
          You&apos;re offline
        </h1>
        <p className="text-body" style={{ color: "var(--text-secondary)", marginBottom: "var(--sp-lg)" }}>
          Fragmenta needs a connection to load new content. Previously viewed pages may still be available.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn-prominent"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
