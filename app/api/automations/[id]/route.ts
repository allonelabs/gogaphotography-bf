/**
 * /api/automations/[id] — update + delete a rule. Enable/disable goes
 * through the PATCH path.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";

const PatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  trigger_event: z.string().optional(),
  conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  actions: z.array(z.record(z.string(), z.unknown())).optional(),
  enabled: z.boolean().optional(),
});

function bad(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code: "bad_input", message } },
    { status },
  );
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("automations.write");
  if (fail) return fail;
  const { id } = await ctx.params;
  const ruleId = Number(id);
  if (!Number.isFinite(ruleId)) return bad("invalid id");

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.message);

  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("automation_rule")
    .update(parsed.data)
    .eq("id", ruleId)
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("automations.write");
  if (fail) return fail;
  const { id } = await ctx.params;
  const ruleId = Number(id);
  if (!Number.isFinite(ruleId)) return bad("invalid id");

  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { error } = await (supabase as any)
    .from("automation_rule")
    .delete()
    .eq("id", ruleId)
    .eq("organization_id", orgId);
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true });
}
