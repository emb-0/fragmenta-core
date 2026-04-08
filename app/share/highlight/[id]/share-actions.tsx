'use client';

import { useState } from 'react';

interface ShareActionsProps {
  highlightId: string;
}

export function ShareActions({ highlightId }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyUrl() {
    const url = `${window.location.origin}/share/highlight/${highlightId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopyUrl}
      className="btn-secondary"
      style={{
        color: copied ? 'var(--success)' : undefined,
        borderColor: copied ? 'var(--success)' : undefined,
      }}
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4L6 11L3 8" />
          </svg>
          Copied URL
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6.5 9.5a3 3 0 004 .5l2-2a3 3 0 00-4.24-4.24l-1.14 1.14" />
            <path d="M9.5 6.5a3 3 0 00-4-.5l-2 2a3 3 0 004.24 4.24l1.14-1.14" />
          </svg>
          Copy URL
        </>
      )}
    </button>
  );
}
