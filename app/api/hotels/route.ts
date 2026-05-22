import { NextResponse } from "next/server";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { buildHotelListQuery } from "./_query";
import { z } from "zod";

const ListSchema = z.object({
  search: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  minStars: z.coerce.number().int().min(0).max(5).optional(),
  countryId: z.coerce.number().int().optional(),
  hotelGroupId: z.coerce.number().int().optional(),
  sort: z.enum(["name", "hotel_range", "id"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = ListSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  }
  const q = buildHotelListQuery(parsed.data);
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

  let query = (supabase as any)
    .from("hotel")
    .select(
      `
      id, name, c_juridical_form_id, c_hotel_group_id, full_name, identification,
      cc1_country_id, cc1_region_id, cc1_city_id, comment, hotel_range,
      group:c_hotel_group(name),
      country:cc1_country(name),
      city:cc1_city(name),
      main_contact:hotel_contact!main_contact_id(name)
    `,
      { count: "exact" },
    )
    .eq("organization_id", orgId)
    .order(q.order.column, { ascending: q.order.ascending })
    .range(q.range.from, q.range.to);

  for (const f of q.filters) {
    // filter is dynamic — cast to any to avoid the overload mess
    query = (query as any)[f.op](f.column, f.value);
  }

  const { data, count, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, data, total: count ?? 0 });
}

export async function POST(req: Request) {
  const fail = await requireApiPermission("hotels.write");
  if (fail) return fail;
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
  const body = await req.json();

  const CreateSchema = z.object({
    name: z.string().min(1),
    type: z.number().int().min(0).max(1).default(1),
    c_juridical_form_id: z.number().int().nullable().optional(),
    c_hotel_group_id: z.number().int().nullable().optional(),
    full_name: z.string().nullable().optional(),
    identification: z.string().nullable().optional(),
    cc1_country_id: z.number().int().nullable().optional(),
    cc1_region_id: z.number().int().nullable().optional(),
    cc1_city_id: z.number().int().nullable().optional(),
    comment: z.string().nullable().optional(),
    hotel_range: z.number().int().min(0).max(5).default(0),
  });

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  }

  const { data, error } = await (supabase as any)
    .from("hotel")
    .insert({ ...parsed.data, organization_id: orgId })
    .select()
    .single();
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, data });
}
