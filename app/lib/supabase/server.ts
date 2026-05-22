import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/app/lib/db/types";

/**
 * Typed server-side Supabase client for the tourism module.
 *
 * Wraps the basic `@supabase/supabase-js` createClient with the generated
 * `Database` types and the service-role key — read/write everywhere, no RLS.
 *
 * For RLS-bound user-context queries (account, organization), use the
 * existing `getSupabaseAdmin()` helper in `app/lib/supabase-server.ts`.
 */
let cached: ReturnType<typeof createClient<Database>> | null = null;

export async function createServerSupabaseClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "createServerSupabaseClient: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set",
    );
  }
  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
