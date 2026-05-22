import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GogaDatabase } from "@/app/lib/db/goga-types";

/**
 * Single-tenant Supabase client for the photographer studio data.
 *
 * Our domain (leads, bookings, packages, projects, hero, pages, services,
 * contact_submissions, chatbot_sessions/messages, contracts, deliveries)
 * lives in one organization — Goga — so we skip BF's `with-org` wrapper
 * and use the service-role key directly. RLS is the safety net; the app
 * layer doesn't need to filter on organization_id.
 *
 * Keep BF's tourism-shaped tables on `createServerSupabaseClient()` from
 * `./server` — that helper still works against the same DB, just with the
 * BF `Database` types. Our types live in `app/lib/db/goga-types.ts`.
 */
let cached: SupabaseClient<GogaDatabase> | null = null;

export function gogaAdmin(): SupabaseClient<GogaDatabase> {
  if (cached) return cached;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "gogaAdmin: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
    );
  }
  cached = createClient<GogaDatabase>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "gogaphotography-bf" } },
  });
  return cached;
}
