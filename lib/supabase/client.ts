import { createClient } from '@supabase/supabase-js';

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  return url;
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
  return key;
}

function getSupabaseServiceKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  return key;
}

// Public client (for client components, respects RLS)
export function createBrowserClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}

// Server client (for server components, route handlers, server actions)
// Uses service role key to bypass RLS (no auth in Sprint 1)
export function createServerClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceKey());
}
