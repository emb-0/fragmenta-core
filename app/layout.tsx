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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <nav className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-foreground">
              Fragmenta
            </Link>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/library" className="text-muted hover:text-foreground transition-colors">
                Library
              </Link>
              <Link href="/search" className="text-muted hover:text-foreground transition-colors">
                Search
              </Link>
              <Link href="/import" className="text-muted hover:text-foreground transition-colors">
                Import
              </Link>
              <Link href="/imports" className="text-muted hover:text-foreground transition-colors">
                History
              </Link>
            </div>
          </nav>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="border-t border-border">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-muted">Fragmenta &mdash; your reading, collected.</p>
            <div className="flex gap-4 text-xs text-muted">
              <a href="/api/exports/markdown" className="hover:text-foreground transition-colors">Export MD</a>
              <a href="/api/exports/csv" className="hover:text-foreground transition-colors">Export CSV</a>
              <a href="/api/exports/json" className="hover:text-foreground transition-colors">Export JSON</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
