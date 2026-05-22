import { NextResponse } from "next/server";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { z } from "zod";

const PatchSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.number().int().min(0).max(1).optional(),
  c_juridical_form_id: z.number().int().nullable().optional(),
  c_hotel_group_id: z.number().int().nullable().optional(),
  full_name: z.string().nullable().optional(),
  identification: z.string().nullable().optional(),
  cc1_country_id: z.number().int().nullable().optional(),
  cc1_region_id: z.number().int().nullable().optional(),
  cc1_city_id: z.number().int().nullable().optional(),
  comment: z.string().nullable().optional(),
  hotel_range: z.number().int().min(0).max(5).optional(),
  main_contact_id: z.number().int().nullable().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthenticated", message: (e as Error).message },
      },
      { status: 401 },
    );
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("hotel")
    .select(
      `*, group:c_hotel_group(*), country:cc1_country(*), region:cc1_region(*), city:cc1_city(*), juridical:c_juridical_form(*)`,
    )
    .eq("id", Number(id))
    .eq("organization_id", orgId)
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "not_found", message: error.message } },
      { status: 404 },
    );
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("hotels.write");
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

  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthenticated", message: (e as Error).message },
      },
      { status: 401 },
    );
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("hotel")
    .update(parsed.data)
    .eq("id", Number(id))
    .eq("organization_id", orgId)
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
  const fail = await requireApiPermission("hotels.delete");
  if (fail) return fail;
  const { id } = await params;
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "unauthenticated", message: (e as Error).message },
      },
      { status: 401 },
    );
  }
  const { client: supabase, orgId } = scoped;
  const { error } = await (supabase as any)
    .from("hotel")
    .delete()
    .eq("id", Number(id))
    .eq("organization_id", orgId);
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
