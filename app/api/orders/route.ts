/**
 * Orders (`p_order`) — list + create.
 *
 * GET /api/orders?search=&status=&page=1&pageSize=50
 *   Returns p_order rows with line-item counts and the parent client linked
 *   from `administration`. The list embeds per-vertical line item arrays so
 *   the UI can render "what's in this order" inline.
 *
 * POST /api/orders — create a new draft order (most fields nullable).
 *
 * Org-scoping: rows are filtered by `organization_id = session.org_id`, and
 * inserts stamp it from the session. The `p_order` table carries the column
 * (added in migration 0006).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { dispatchEvent } from "@/app/lib/automation/dispatcher";

const ListSchema = z.object({
  search: z.string().default(""),
  status: z.string().optional(),
  clientId: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  sort: z
    .enum(["id", "order_number", "order_date", "all_sell_price"])
    .optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

const InsertSchema = z.object({
  order_number: z.number().int().nullable().optional(),
  client_id: z.number().int().nullable().optional(),
  client_first_name: z.string().nullable().optional(),
  client_last_name: z.string().nullable().optional(),
  client_pasport_number: z.string().nullable().optional(),
  client_self_number: z.string().nullable().optional(),
  client_phone: z.string().nullable().optional(),
  client_category: z.string().nullable().optional(),
  client_address: z.string().nullable().optional(),
  client_country: z.string().nullable().optional(),
  client_region: z.string().nullable().optional(),
  client_city: z.string().nullable().optional(),
  client_birthday: z.string().nullable().optional(),
  geter_invoice_number: z.string().nullable().optional(),
  self_invoice_number: z.string().nullable().optional(),
  avia_invoice_number: z.string().nullable().optional(),
  additional_number: z.string().nullable().optional(),
  c_semblance: z.string().nullable().optional(),
  company_parameters_id: z.number().int().nullable().optional(),
  cm_name: z.string().nullable().optional(),
  cm_juridical_address: z.string().nullable().optional(),
  cm_address: z.string().nullable().optional(),
  cm_identification: z.string().nullable().optional(),
  cm_director: z.string().nullable().optional(),
  cm_bank_name: z.string().nullable().optional(),
  cm_bank_code: z.string().nullable().optional(),
  cm_bank_number: z.string().nullable().optional(),
  cm_currency: z.string().nullable().optional(),
  order_date: z.string().nullable().optional(),
  level: z.number().int().nullable().optional(),
  c_pay_type: z.string().nullable().optional(),
  c_pay_proviso: z.string().nullable().optional(),
  all_sell_price: z.number().nullable().optional(),
  days: z.number().int().nullable().optional(),
  in_pay: z.boolean().nullable().optional(),
  info: z.string().nullable().optional(),
});

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = ListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) return bad(parsed.error.message);
  const { search, status, clientId, page, pageSize, sort, dir } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  let q = (supabase as any)
    .from("p_order")
    .select(
      `
      id, order_number, c_semblance, client_id, client_first_name, client_last_name,
      client_phone, order_date, level, c_pay_type, all_sell_price, days, in_pay,
      created_at,
      hotels:p_order_hotel(id),
      avias:p_order_avia(id),
      transfers:p_order_transfer(id),
      excursions:p_order_excursion(id),
      ensures:p_order_ensure(id),
      visas:p_order_visa(id),
      services:p_order_service(id),
      tourists:p_order_tourist(id)
    `,
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .order(sort ?? "id", { ascending: (dir ?? "desc") === "asc" })
    .range(from, to);

  if (search) {
    const term = `%${search}%`;
    q = q.or(
      `client_first_name.ilike.${term},client_last_name.ilike.${term},order_number::text.ilike.${term}`,
    );
  }
  if (status) q = q.eq("c_semblance", status);
  if (clientId) q = q.eq("client_id", clientId);

  const { data, count, error } = await q;
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true, data, total: count ?? 0 });
}

export async function POST(req: Request) {
  const fail = await requireApiPermission("orders.write");
  if (fail) return fail;
  const body = await req.json();
  const parsed = InsertSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.message);
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;
  const { data, error } = await (supabase as any)
    .from("p_order")
    .insert({ ...parsed.data, organization_id: orgId })
    .select()
    .single();
  if (error) return bad(error.message, "db", 500);

  // Fire the automation event. Best-effort — a misconfigured rule must
  // not break order creation. The dispatcher itself swallows errors per
  // rule; this try/catch is the outer guard.
  try {
    await dispatchEvent("order.created", { order: data }, orgId);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[orders.POST] dispatchEvent failed", e);
  }

  return NextResponse.json({ ok: true, data });
}
