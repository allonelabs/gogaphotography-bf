"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser-side Supabase client for Realtime subscriptions only.
 *
 * Uses the NEXT_PUBLIC publishable key — NEVER the service-role key.
 * Subscriptions ride on Supabase Realtime, which authenticates with the
 * anon/publishable key. Reads/writes that need privilege still go
 * through server actions backed by gogaAdmin().
 */
let cached: SupabaseClient | null = null;

export function browserSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "browserSupabase: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return cached;
}
