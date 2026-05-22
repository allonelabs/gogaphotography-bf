/**
 * Refund detail (`p_refund`) — read / update / delete. Mirrors /api/orders/[id].
 *
 * Org-scoping: every read/update/delete is filtered by
 * `organization_id = session.org_id`.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";

const PatchSchema = z
  .object({
    p_order_id: z.number().int().nullable(),
    order_number: z.number().int().nullable(),
    c_semblance: z.string().nullable(),
    client_id: z.number().int().nullable(),
    client_first_name: z.string().nullable(),
    client_last_name: z.string().nullable(),
    client_pasport_number: z.string().nullable(),
    client_self_number: z.string().nullable(),
    client_phone: z.string().nullable(),
    client_category: z.string().nullable(),
    client_address: z.string().nullable(),
    client_country: z.string().nullable(),
    client_region: z.string().nullable(),
    client_city: z.string().nullable(),
    client_birthday: z.string().nullable(),
    geter_invoice_number: z.string().nullable(),
    self_invoice_number: z.string().nullable(),
    avia_invoice_number: z.string().nullable(),
    additional_number: z.string().nullable(),
    company_parameters_id: z.number().int().nullable(),
    cm_name: z.string().nullable(),
    cm_juridical_address: z.string().nullable(),
    cm_address: z.string().nullable(),
    cm_identification: z.string().nullable(),
    cm_director: z.string().nullable(),
    cm_bank_name: z.string().nullable(),
    cm_bank_code: z.string().nullable(),
    cm_bank_number: z.string().nullable(),
    cm_currency: z.string().nullable(),
    order_date: z.string().nullable(),
    level: z.number().int().nullable(),
    c_pay_type: z.string().nullable(),
    c_pay_proviso: z.string().nullable(),
    all_sell_price: z.number().nullable(),
    days: z.number().int().nullable(),
    in_pay: z.boolean().nullable(),
    info: z.string().nullable(),
  })
  .partial();

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("p_refund")
    .select(
      `
      *,
      tourists:p_refund_tourist(*),
      hotels:p_refund_hotel(*),
      avias:p_refund_avia(*),
      transfers:p_refund_transfer(*),
      excursions:p_refund_excursion(*),
      ensures:p_refund_ensure(*),
      visas:p_refund_visa(*),
      services:p_refund_service(*)
    `,
    )
    .eq("id", Number(id))
    .eq("organization_id", orgId)
    .single();
  if (error) return bad(error.message, "not_found", 404);
  return NextResponse.json({ ok: true, data });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("refunds.write");
  if (fail) return fail;
  const { id } = await params;
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
    .from("p_refund")
    .update(parsed.data)
    .eq("id", Number(id))
    .eq("organization_id", orgId)
    .select()
    .single();
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("refunds.delete");
  if (fail) return fail;
  const { id } = await params;
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { error } = await (supabase as any)
    .from("p_refund")
    .delete()
    .eq("id", Number(id))
    .eq("organization_id", orgId);
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true });
}
