import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fragmenta",
  description: "Your reading highlights, collected and searchable.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
};

const navLinks = [
  { href: "/library", label: "Library" },
  { href: "/bookshelf", label: "Shelf" },
  { href: "/search", label: "Search" },
  { href: "/import", label: "Import" },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
    >
      <body className="min-h-dvh flex flex-col relative">
        {/* Ambient background glows */}
        <div className="screen-glow" aria-hidden="true" />

        {/* Navigation */}
        <header className="sticky top-0 z-40 backdrop-blur-xl" style={{ background: 'rgba(7, 9, 12, 0.85)' }}>
          <nav className="page-container !py-0">
            <div className="flex items-center justify-between h-14">
              <Link
                href="/"
                className="text-card-title text-text-1 tracking-tight hover:opacity-80 transition-opacity"
              >
                Fragmenta
              </Link>
              <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="chip !border-transparent !bg-transparent text-text-3 hover:!bg-surface-3 hover:text-text-2"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
          <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
        </header>

        {/* Main content */}
        <main className="flex-1 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="relative z-10" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="page-container !py-4">
            <div className="flex items-center justify-between">
              <p className="text-eyebrow" style={{ textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 }}>
                <span style={{ color: 'var(--text-tertiary)' }}>Fragmenta</span>
              </p>
              <div className="flex gap-1">
                <a href="/api/exports/markdown" className="btn-ghost text-text-3">Markdown</a>
                <a href="/api/exports/csv" className="btn-ghost text-text-3">CSV</a>
                <a href="/api/exports/json" className="btn-ghost text-text-3">JSON</a>
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
