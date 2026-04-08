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
    <div className="flex gap-3" style={{ alignItems: 'stretch' }}>
      <div className="surface-field flex-1 flex items-center gap-3" style={{ padding: '0 var(--sp-md)' }}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--text-tertiary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <circle cx="7" cy="7" r="5" />
          <path d="M11 11L14 14" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          placeholder="Search highlights, notes, titles, authors..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: 'var(--font-body)',
            padding: 'var(--sp-md) 0',
          }}
        />
      </div>
      <button
        onClick={handleSearch}
        disabled={!query.trim()}
        className="btn-prominent"
      >
        Search
      </button>
    </div>
  );
}
