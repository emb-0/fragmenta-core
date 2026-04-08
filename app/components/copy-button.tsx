"use client";

import { useState } from "react";

interface CopyButtonProps {
  text: string;
  /** Include book title/author as citation */
  citation?: string;
}

export function CopyButton({ text, citation }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const copyText = citation ? `"${text}"\n\n— ${citation}` : text;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-ghost"
      title="Copy to clipboard"
      style={{
        color: copied ? 'var(--success)' : undefined,
      }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 4L6 11L3 8" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="5" width="8" height="8" rx="1.5" />
            <path d="M3 11V3.5A.5.5 0 013.5 3H11" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
