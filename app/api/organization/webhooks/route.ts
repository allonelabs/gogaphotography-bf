// Webhooks: list, create, toggle active, delete.
// Each webhook gets a 32-byte hex secret on creation. The secret is shown
// once on POST (stored as plaintext in DB for now — a future hardening pass
// would hash it like api_keys).

import { auth } from "../../../../auth";
import { getSupabaseAdmin, getDefaultTenantId } from "../../../lib/supabase-server";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function logAudit(action: string, target: string, email: string | null, name: string | null, tenantId: string): Promise<void> {
  await getSupabaseAdmin().from("tenant_audit").insert({
    tenant_id: tenantId,
    actor_email: email,
    actor_name: name,
    action,
    target,
  });
}

export async function GET(): Promise<Response> {
  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("tenant_webhooks")
      .select("id,url,events,is_active,created_at,last_fired")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return jsonResponse({ ok: true, webhooks: data ?? [] });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const actorEmail = session?.user?.email ?? null;
  const actorName = session?.user?.name ?? null;

  let body: { url?: string; events?: string[] } = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "invalid json" }, 400); }
  const url = (body.url ?? "").trim();
  if (!url || !/^https?:\/\//.test(url)) return jsonResponse({ ok: false, error: "valid https URL required" }, 400);
  const events = Array.isArray(body.events) ? body.events.filter((e): e is string => typeof e === "string") : [];

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const secret = `whsec_${randomBytes(24).toString("base64url")}`;
    const { data, error } = await sb
      .from("tenant_webhooks")
      .insert({ tenant_id: tenantId, url, secret, events, is_active: true })
      .select("id,url,events,is_active,created_at")
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    await logAudit("webhook.created", url, actorEmail, actorName, tenantId);

    return jsonResponse({ ok: true, webhook: { ...data, secret } });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function PATCH(req: Request): Promise<Response> {
  let body: { id?: string; is_active?: boolean } = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "invalid json" }, 400); }
  if (!body.id || typeof body.is_active !== "boolean") return jsonResponse({ ok: false, error: "id + is_active required" }, 400);

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("tenant_webhooks")
      .update({ is_active: body.is_active })
      .eq("id", body.id)
      .eq("tenant_id", tenantId)
      .select("id,url,is_active")
      .single();
    if (error || !data) throw error ?? new Error("not found");
    return jsonResponse({ ok: true, webhook: data });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const session = await auth();
  const actorEmail = session?.user?.email ?? null;
  const actorName = session?.user?.name ?? null;

  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (!id) return jsonResponse({ ok: false, error: "id required" }, 400);

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("tenant_webhooks")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("url")
      .single();
    if (error || !data) throw error ?? new Error("not found");
    await logAudit("webhook.deleted", data.url, actorEmail, actorName, tenantId);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

function errMsg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
