/**
 * /api/automations — list + create automation rules.
 *
 * Org-scoped: rows filtered by `organization_id = session.org_id`, and
 * inserts stamp it from the session.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { validateDraft } from "@/app/lib/automation/catalog";

const InsertSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  trigger_event: z.string().min(1),
  conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  actions: z.array(z.record(z.string(), z.unknown())).min(1),
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

export async function GET() {
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("automation_rule")
    .select("*")
    .eq("organization_id", orgId)
    .order("id", { ascending: false });
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const fail = await requireApiPermission("automations.write");
  if (fail) return fail;
  const body = await req.json();
  const parsed = InsertSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.message);

  const issues = validateDraft({
    name: parsed.data.name,
    trigger_event: parsed.data.trigger_event,
    conditions: parsed.data.conditions ?? null,
    actions: parsed.data.actions as Array<{
      kind: string;
      [k: string]: unknown;
    }>,
  });
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: { code: "validation", issues } },
      { status: 422 },
    );
  }

  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId, userEmail } = scoped;

  const { data, error } = await (supabase as any)
    .from("automation_rule")
    .insert({
      organization_id: orgId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_event: parsed.data.trigger_event,
      conditions: parsed.data.conditions ?? null,
      actions: parsed.data.actions,
      enabled: parsed.data.enabled ?? true,
      created_by: userEmail,
    })
    .select()
    .single();
  if (error) return bad(error.message, 500);
  return NextResponse.json({ ok: true, data });
}
