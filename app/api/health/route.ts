import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liveness + readiness check. Returns 200 if the runtime can start; the
// `checks` field reports per-dependency status without failing the
// endpoint (so uptime monitors see green even when one optional
// dependency is degraded — the body is the diagnostic).

interface CheckResult {
  ok: boolean;
  detail?: string;
}

async function checkSupabase(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) return { ok: false, detail: "NEXT_PUBLIC_SUPABASE_URL missing" };
  if (!anon)
    return {
      ok: false,
      detail: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing",
    };
  try {
    // PostgREST root rejects auth; instead query a known small table.
    // `hero` is the single-tenant settings singleton (id=1) and is one of
    // the few tables anon may SELECT under RLS — this probe uses the anon
    // key. (Was `organization`: a BF tourism table absent from this DB, so
    // the check reported a permanent false "degraded". `studio_info` is
    // admin-only and 401s for anon, so it can't serve as the probe either.)
    const res = await fetch(`${url}/rest/v1/hero?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(3000),
    });
    return { ok: res.ok, detail: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

function checkVertex(): CheckResult {
  const proj = process.env.GCP_PROJECT_ID;
  const sa = process.env.GCP_SA_JSON_B64;
  if (!proj || !sa) {
    return {
      ok: false,
      detail:
        "GCP_PROJECT_ID and/or GCP_SA_JSON_B64 missing — chat will fall back to Anthropic if configured",
    };
  }
  return { ok: true };
}

function checkAuth(): CheckResult {
  const url = process.env.NEXTAUTH_URL;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!url || !secret) {
    return { ok: false, detail: "NEXTAUTH_URL or NEXTAUTH_SECRET missing" };
  }
  return { ok: true };
}

export async function GET() {
  const [supabase] = await Promise.all([checkSupabase()]);
  const vertex = checkVertex();
  const auth = checkAuth();

  const checks: Record<string, CheckResult> = { supabase, vertex, auth };
  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: true, // endpoint itself is alive
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
