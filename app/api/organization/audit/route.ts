// Audit log: read-only listing of recent events for the default tenant.
// Append-only — no POST/DELETE on this route. Other endpoints write rows
// via the audit helper inline.

import { getSupabaseAdmin, getDefaultTenantId } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const u = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(u.searchParams.get("limit") ?? "100")));
    const { data, error } = await sb
      .from("tenant_audit")
      .select("id,actor_email,actor_name,action,target,metadata,ip,created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return jsonResponse({ ok: true, entries: data ?? [] });
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : "db error" }, 500);
  }
}

function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
