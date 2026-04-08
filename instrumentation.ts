/**
 * Next.js instrumentation — runs once at server startup.
 * Validates required environment variables and fails loudly if any are missing.
 * Optional vars (GOOGLE_BOOKS_API_KEY, ANTHROPIC_API_KEY) are not checked here
 * because their features degrade gracefully when unset.
 */
export function register() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const lines = missing.map((k) => `  - ${k}`).join('\n');
    console.error(
      `\n[fragmenta] Missing required environment variables:\n${lines}\n\n` +
        `Copy .env.example to .env.local and fill in the values.\n`,
    );
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
