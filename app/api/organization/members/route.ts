// Members: list active members, change a member's role, remove a member.
// Service role bypasses RLS — the API route is the trust boundary.

import { auth } from "../../../../auth";
import { getSupabaseAdmin, getDefaultTenantId } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["owner", "admin", "operator", "viewer"] as const;
type Role = (typeof ROLES)[number];

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
      .from("tenant_members")
      .select("id,email,name,role,status,last_active,created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return jsonResponse({ ok: true, members: data ?? [] });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  const actorEmail = session?.user?.email ?? null;
  const actorName = session?.user?.name ?? null;

  let body: { id?: string; role?: string; status?: string } = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "invalid json" }, 400); }
  if (!body.id) return jsonResponse({ ok: false, error: "id required" }, 400);

  const update: Record<string, string> = {};
  if (body.role && (ROLES as readonly string[]).includes(body.role)) update.role = body.role;
  if (body.status && ["active", "suspended"].includes(body.status)) update.status = body.status;
  if (Object.keys(update).length === 0) return jsonResponse({ ok: false, error: "nothing to update" }, 400);

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("tenant_members")
      .update(update)
      .eq("id", body.id)
      .eq("tenant_id", tenantId)
      .select("email,name,role,status")
      .single();
    if (error || !data) throw error ?? new Error("not found");

    if (update.role) await logAudit("member.role-changed", `${data.email} → ${update.role}`, actorEmail, actorName, tenantId);
    if (update.status) await logAudit(`member.${update.status === "suspended" ? "suspended" : "reinstated"}`, data.email, actorEmail, actorName, tenantId);

    return jsonResponse({ ok: true, member: data });
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
      .from("tenant_members")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("email")
      .single();
    if (error || !data) throw error ?? new Error("not found");

    await logAudit("member.removed", data.email, actorEmail, actorName, tenantId);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

function errMsg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
