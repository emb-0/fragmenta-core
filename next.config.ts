import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix: Next.js 16 (Turbopack) infers workspace root from lockfiles.
  // A package-lock.json at ~/ causes an incorrect root inference.
  // Setting turbopack.root explicitly to the project directory silences the warning.
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "books.google.com",
        pathname: "/books/**",
      },
    ],
  },
};

export default nextConfig;
