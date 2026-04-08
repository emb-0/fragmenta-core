"use client";

import Image from "next/image";
import { useState } from "react";

interface BookCoverProps {
  title: string;
  author: string | null;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { width: 100, height: 150 },
  md: { width: 140, height: 210 },
  lg: { width: 180, height: 270 },
};

/**
 * Generates a deterministic warm color from a string hash.
 * Uses the book's literary palette: muted blues, taupes, deep greens.
 */
function generateCoverColor(title: string): string {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Palette of literary colors
  const palette = [
    '#2D3A4A', '#3A2D2D', '#2D3A2D', '#3A3A2D',
    '#2D2D3A', '#3A2D3A', '#344050', '#40343A',
    '#34403A', '#403A34', '#2E3845', '#382E2E',
  ];
  return palette[Math.abs(hash) % palette.length];
}

export function BookCover({ title, author, coverUrl, thumbnailUrl, size = "md" }: BookCoverProps) {
  const [imgError, setImgError] = useState(false);
  const { width, height } = sizes[size];
  const src = coverUrl || thumbnailUrl;

  if (src && !imgError) {
    return (
      <div
        className="book-cover-frame"
        style={{ width, height, position: "relative", flexShrink: 0 }}
      >
        <Image
          src={src}
          alt={`Cover of ${title}`}
          width={width}
          height={height}
          style={{
            objectFit: "cover",
            borderRadius: "var(--radius-sm)",
            width: "100%",
            height: "100%",
          }}
          onError={() => setImgError(true)}
          loading="lazy"
          sizes={`${width}px`}
        />
      </div>
    );
  }

  // Fallback: typographic cover
  const bg = generateCoverColor(title);
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");

  return (
    <div
      className="book-cover-fallback"
      style={{
        width,
        height,
        background: `linear-gradient(145deg, ${bg} 0%, ${bg}dd 100%)`,
        borderRadius: "var(--radius-sm)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: size === "sm" ? "8px" : "12px",
        border: "1px solid var(--border-subtle)",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle texture overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          fontSize: size === "sm" ? "1.5rem" : size === "md" ? "2rem" : "2.5rem",
          fontWeight: 700,
          color: "rgba(255,255,255,0.25)",
          letterSpacing: "0.05em",
          position: "relative",
          zIndex: 1,
          marginBottom: "8px",
        }}
      >
        {initials}
      </span>
      <span
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: size === "sm" ? "0.6rem" : "0.7rem",
          fontWeight: 400,
          color: "rgba(255,255,255,0.55)",
          textAlign: "center",
          lineHeight: 1.3,
          position: "relative",
          zIndex: 1,
          display: "-webkit-box",
          WebkitLineClamp: size === "sm" ? 2 : 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {title}
      </span>
      {author && size !== "sm" && (
        <span
          style={{
            fontSize: "0.55rem",
            fontWeight: 500,
            color: "rgba(255,255,255,0.35)",
            textAlign: "center",
            marginTop: "4px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {author}
        </span>
      )}
    </div>
  );
}
