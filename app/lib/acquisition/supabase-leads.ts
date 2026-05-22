// Read-only client for the shared allone-scraper Supabase project
// (`cywmdjldapzrnabsoosd`). The scraper writes; BF reads. We never
// INSERT / UPDATE / DELETE — only SELECT — so per-spawn outreach state
// stays in BF's own out/<spawn>/.acquisition/ ledgers and the
// allonelabs lead pipeline keeps its own status / value / scored_at
// fields untouched.
//
// Env contract:
//   LEAD_SUPABASE_URL                  — https://<project-ref>.supabase.co
//   LEAD_SUPABASE_SERVICE_ROLE_KEY     — service-role key
//
// When either is unset, callers fall back to the synthetic generator.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface LeadsRow {
  id: string;
  name: string;
  company: string | null;
  company_name_local: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  matched_service: string | null;
  relevance_score: number | null;
  tags: string[] | null;
  source_id: string | null;
  source_url: string | null;
  is_scraped: boolean | null;
}

export interface LeadsSearchInput {
  /** ICP keywords — matched against name/description/industry. */
  keywords: readonly string[];
  /** ICP regions — matched against city / country. Empty = no region filter. */
  regions: readonly string[];
  /** Hard cap so one cycle doesn't drain the whole table. */
  limit?: number;
}

let cached: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.LEAD_SUPABASE_URL;
  const key = process.env.LEAD_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    cached = null;
    return null;
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export function leadsBackendConfigured(): boolean {
  return getClient() !== null;
}

/**
 * SELECT leads matching the ICP. Strictly read-only — no writes ever.
 * Returns an empty array when the backend is unconfigured so callers
 * can cleanly fall back to synthetic.
 */
export async function searchLeads(input: LeadsSearchInput): Promise<LeadsRow[]> {
  const client = getClient();
  if (!client) return [];

  const { keywords, regions, limit = 40 } = input;
  let q = client
    .from('leads')
    .select(
      'id,name,company,company_name_local,email,phone,website,industry,company_size,description,address,city,country,linkedin_url,facebook_url,instagram_url,matched_service,relevance_score,tags,source_id,source_url,is_scraped',
    )
    .order('relevance_score', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (regions.length > 0) {
    // City OR country — matches "Tbilisi" or "GE" style entries.
    const cityClauses = regions.map((r) => `city.ilike.%${escapeIlike(r)}%`).join(',');
    const countryClauses = regions.map((r) => `country.ilike.%${escapeIlike(r)}%`).join(',');
    q = q.or(`${cityClauses},${countryClauses}`);
  }

  if (keywords.length > 0) {
    // Match any keyword against name / industry / description / matched_service.
    const parts: string[] = [];
    for (const k of keywords.slice(0, 5)) {
      const e = escapeIlike(k);
      parts.push(`name.ilike.%${e}%`);
      parts.push(`industry.ilike.%${e}%`);
      parts.push(`description.ilike.%${e}%`);
      parts.push(`matched_service.ilike.%${e}%`);
    }
    if (parts.length > 0) {
      q = q.or(parts.join(','));
    }
  }

  const { data, error } = await q;
  if (error) {
    // Don't throw — log and let caller fall back. The acquisition pipeline
    // shouldn't dead-end because of one Supabase blip.
    console.warn(`[supabase-leads] search failed: ${error.message}`);
    return [];
  }
  return (data ?? []) as LeadsRow[];
}

function escapeIlike(s: string): string {
  // Supabase PostgREST .or() splits on commas; escape commas + percents so
  // they don't break the filter string.
  return s.replace(/[%,]/g, ' ').trim();
}
