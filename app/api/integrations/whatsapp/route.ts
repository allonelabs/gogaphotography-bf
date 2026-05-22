/**
 * GET  /api/integrations/whatsapp — return current org's whatsapp integration
 *                                  (config has secrets masked).
 * PUT  /api/integrations/whatsapp — upsert the integration row.
 *
 * Only admin/manager roles can read/write the integration (it carries
 * credentials). The PUT body is partial: only fields present in the body
 * are written; fields that are missing leave the existing value intact.
 * Sensitive fields (`access_token`, `webhook_app_secret`) are write-only:
 * GET masks them; PUT only replaces them if the field is non-empty.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";

const SENSITIVE = ["access_token", "webhook_app_secret"] as const;

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

function forbidden() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "forbidden",
        message: "Only admins or managers can configure integrations",
      },
    },
    { status: 403 },
  );
}

function maskConfig(
  config: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const src = config ?? {};
  for (const [k, v] of Object.entries(src)) {
    if ((SENSITIVE as readonly string[]).includes(k)) {
      out[k] = typeof v === "string" && v.length > 0 ? "__set__" : "";
    } else {
      out[k] = v;
    }
  }
  // Mark presence flags so the form can show "Token is set — Update".
  out["__access_token_set"] =
    typeof src["access_token"] === "string" && src["access_token"].length > 0;
  out["__webhook_app_secret_set"] =
    typeof src["webhook_app_secret"] === "string" &&
    src["webhook_app_secret"].length > 0;
  return out;
}

function isAdminish(role: string | null): boolean {
  return role === "admin" || role === "manager";
}

export async function GET() {
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  if (!isAdminish(scoped.role)) return forbidden();

  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("org_integration")
    .select("id, enabled, config, updated_at")
    .eq("organization_id", orgId)
    .eq("kind", "whatsapp")
    .maybeSingle();
  if (error) return bad(error.message, "db", 500);

  return NextResponse.json({
    ok: true,
    data: data
      ? {
          id: data.id,
          enabled: !!data.enabled,
          config: maskConfig(data.config),
          updated_at: data.updated_at,
        }
      : null,
  });
}

const PutSchema = z
  .object({
    enabled: z.boolean(),
    phone_number_id: z.string().nullish(),
    business_account_id: z.string().nullish(),
    phone_display: z.string().nullish(),
    webhook_verify_token: z.string().nullish(),
    // Sensitive — only persisted if non-empty
    access_token: z.string().nullish(),
    webhook_app_secret: z.string().nullish(),
  })
  .strict();

export async function PUT(req: Request) {
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  if (!isAdminish(scoped.role)) return forbidden();

  const raw = await req.json().catch(() => null);
  const parsed = PutSchema.safeParse(raw);
  if (!parsed.success) return bad(parsed.error.message);

  const { client: supabase, orgId } = scoped;

  // Load existing row so we can merge into config (preserving secrets when
  // the form left them blank).
  const { data: existing, error: loadErr } = await (supabase as any)
    .from("org_integration")
    .select("id, config")
    .eq("organization_id", orgId)
    .eq("kind", "whatsapp")
    .maybeSingle();
  if (loadErr) return bad(loadErr.message, "db", 500);

  const prevConfig = (existing?.config ?? {}) as Record<string, unknown>;
  const nextConfig: Record<string, unknown> = { ...prevConfig };

  const nonSensitive: Array<keyof typeof parsed.data> = [
    "phone_number_id",
    "business_account_id",
    "phone_display",
    "webhook_verify_token",
  ];
  for (const k of nonSensitive) {
    const v = parsed.data[k];
    if (v !== undefined && v !== null) nextConfig[k as string] = v;
  }
  // Sensitive: only overwrite if non-empty string supplied
  for (const k of SENSITIVE) {
    const v = parsed.data[k];
    if (typeof v === "string" && v.length > 0) {
      nextConfig[k] = v;
    }
  }

  const payload = {
    organization_id: orgId,
    kind: "whatsapp",
    enabled: parsed.data.enabled,
    config: nextConfig,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error: updErr } = await (supabase as any)
      .from("org_integration")
      .update(payload)
      .eq("id", existing.id);
    if (updErr) return bad(updErr.message, "db", 500);
  } else {
    const { error: insErr } = await (supabase as any)
      .from("org_integration")
      .insert(payload);
    if (insErr) return bad(insErr.message, "db", 500);
  }

  return NextResponse.json({
    ok: true,
    data: {
      enabled: payload.enabled,
      config: maskConfig(nextConfig),
    },
  });
}
