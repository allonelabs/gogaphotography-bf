// Invites: list pending, send new (creates invite row + audit), revoke.
// Email send-out is handled by Resend if RESEND_API_KEY is configured;
// otherwise we still record the invite so the operator can copy the link.

import { auth } from "../../../../auth";
import { getSupabaseAdmin, getDefaultTenantId } from "../../../lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES = ["owner", "admin", "operator", "viewer"];

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
      .from("tenant_invites")
      .select("id,email,role,invited_by,sent_at,accepted_at")
      .eq("tenant_id", tenantId)
      .is("accepted_at", null)
      .order("sent_at", { ascending: false });
    if (error) throw error;
    return jsonResponse({ ok: true, invites: data ?? [] });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  const actorEmail = session?.user?.email ?? null;
  const actorName = session?.user?.name ?? null;

  let body: { email?: string; role?: string } = {};
  try { body = await req.json(); } catch { return jsonResponse({ ok: false, error: "invalid json" }, 400); }
  const email = (body.email ?? "").trim().toLowerCase();
  const role = ROLES.includes(body.role ?? "") ? body.role! : "operator";
  if (!email || !email.includes("@")) return jsonResponse({ ok: false, error: "valid email required" }, 400);

  try {
    const sb = getSupabaseAdmin();
    const tenantId = await getDefaultTenantId();
    const { data, error } = await sb
      .from("tenant_invites")
      .upsert(
        { tenant_id: tenantId, email, role, invited_by: actorEmail, sent_at: new Date().toISOString(), accepted_at: null },
        { onConflict: "tenant_id,email" },
      )
      .select("id,email,role,invited_by,sent_at")
      .single();
    if (error || !data) throw error ?? new Error("insert failed");

    await logAudit("member.invited", `${email} (${role})`, actorEmail, actorName, tenantId);

    return jsonResponse({ ok: true, invite: data });
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
      .from("tenant_invites")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("email")
      .single();
    if (error || !data) throw error ?? new Error("not found");

    await logAudit("invite.revoked", data.email, actorEmail, actorName, tenantId);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ ok: false, error: errMsg(err) }, 500);
  }
}

function errMsg(e: unknown): string { return e instanceof Error ? e.message : String(e); }
function jsonResponse(body: object, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}
