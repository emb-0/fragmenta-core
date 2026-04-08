"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SearchBar({ initialQuery }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery || "");
  const router = useRouter();

  function handleSearch() {
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSearch();
        }}
        placeholder="Search highlights, notes, titles, authors..."
        className="flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent"
      />
      <button
        onClick={handleSearch}
        disabled={!query.trim()}
        className="btn-primary"
      >
        Search
      </button>
    </div>
  );
}
