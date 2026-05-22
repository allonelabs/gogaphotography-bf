import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  cc1_country_id: z.number().int().nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("catalogs.write");
  if (fail) return fail;
  const { id } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  const supabase = await createServerSupabaseClientWithAudit();
  const { data, error } = await (supabase as any)
    .from("cc1_region")
    .update(parsed.data)
    .eq("id", Number(id))
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("catalogs.delete");
  if (fail) return fail;
  const { id } = await params;
  const supabase = await createServerSupabaseClientWithAudit();
  const { error } = await (supabase as any)
    .from("cc1_region")
    .delete()
    .eq("id", Number(id));
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
