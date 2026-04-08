import Link from "next/link";
import { listBooks } from "@/lib/supabase/db";

export default async function Home() {
  let bookCount = 0;
  try {
    const books = await listBooks();
    bookCount = books.length;
  } catch {
    // DB may not be connected yet
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            Your reading, collected.
          </h1>
          <p className="text-muted text-lg max-w-lg leading-relaxed">
            Import your Kindle highlights and build a searchable personal
            library of everything you&rsquo;ve marked, noted, and remembered.
          </p>
        </div>

        <div className="flex gap-4">
          <Link
            href="/import"
            className="inline-flex items-center px-5 py-2.5 bg-accent text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity"
          >
            Import highlights
          </Link>
          <Link
            href="/library"
            className="inline-flex items-center px-5 py-2.5 border border-border text-sm font-medium rounded-md hover:bg-surface transition-colors"
          >
            Browse library
          </Link>
        </div>

        {bookCount > 0 && (
          <p className="text-sm text-muted">
            {bookCount} {bookCount === 1 ? "book" : "books"} in your library.
          </p>
        )}
      </div>
    </div>
  );
}
