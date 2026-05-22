// API keys: list, create, revoke. Live key string is shown ONCE on creation
// — only the SHA-256 hash is stored. Server returns the prefix + suffix on
// list so the UI can render "ao_live_…jq2x" without exposing the full key.

import { auth } from "../../../../auth";
import { getSupabaseAdmin, getDefaultTenantId } from "../../../lib/supabase-server";
import { createHash, randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CreateBody {
  name?: string;
  scopes?: string[];
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function makeKey(): { full: string; prefix: string; suffix: string; hash: string } {
  const raw = randomBytes(24).toString("base64url");
  const full = `ao_live_${raw}`;
  return {
    full,
    prefix: full.slice(0, 8),                  // "ao_live_"
    suffix: full.slice(-4),
    hash: sha256(full),
  };
}

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
      .from("api_keys")
      .select("id,name,scopes,prefix,suffix,created_at,revoked_at,last_used_at,created_by_email")
      .eq("tenant_id", tenantId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return jsonResponse({ ok: true, keys: data ?? [] });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const sessionName = session?.user?.name ?? null;

  let body: CreateBody = {};
  try { body = (await req.json()) as CreateBody; } catch { return jsonResponse({ ok: false, error: "invalid json" }, 400); }
  const name = (body.name ?? "").trim();
  if (!name) return jsonResponse({ ok: false, error: "name required" }, 400);
  const scopes = Array.isArray(body.scopes) ? body.scopes.filter((s): s is string => typeof s === "string") : ["read"];

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const k = makeKey();
    const { data, error } = await sb
      .from("api_keys")
      .insert({
        tenant_id: tenantId,
        name,
        key_hash: k.hash,
        prefix: k.prefix,
        suffix: k.suffix,
        scopes,
        created_by_email: email,
      })
      .select("id,name,scopes,prefix,suffix,created_at")
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    await logAudit("apikey.created", name, email, sessionName, tenantId);

    return jsonResponse({ ok: true, key: { ...data, full: k.full } });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function DELETE(req: Request): Promise<Response> {
  const session = await auth();
  const email = session?.user?.email ?? null;
  const sessionName = session?.user?.name ?? null;

  const u = new URL(req.url);
  const id = u.searchParams.get("id");
  if (!id) return jsonResponse({ ok: false, error: "id required" }, 400);

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .is("revoked_at", null)
      .select("name")
      .single();
    if (error || !data) throw error ?? new Error("not found");

    await logAudit("apikey.revoked", data.name, email, sessionName, tenantId);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

function errMsg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
