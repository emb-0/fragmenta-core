import Link from "next/link";

export default function BookNotFound() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16 text-center space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Book not found</h1>
      <p className="text-muted">
        This book doesn&rsquo;t exist or may have been removed.
      </p>
      <Link
        href="/library"
        className="inline-block text-sm text-muted hover:text-foreground underline"
      >
        Back to library
      </Link>
    </div>
  );
}
