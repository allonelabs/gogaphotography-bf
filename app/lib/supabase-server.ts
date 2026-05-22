// Server-side Supabase client using the service-role key. NEVER import this
// from a client component — the secret key has full DB access.
//
// Use for: API route handlers that need to write to tables protected by RLS,
// or read across tenants. For per-user reads, use a request-scoped anon
// client with the user's JWT instead.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "server-only";

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase not configured: missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// Default tenant slug — every API call falls back to this until per-user
// tenants are wired. Seeded once via SQL: see 0003_profiles.sql.
export const DEFAULT_TENANT_SLUG = "allonce";

export async function getDefaultTenantId(): Promise<string> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("tenants")
    .select("id")
    .eq("slug", DEFAULT_TENANT_SLUG)
    .single();
  if (error || !data) {
    throw new Error(`default tenant not found: ${error?.message ?? "no rows"}`);
  }
  return data.id;
}
