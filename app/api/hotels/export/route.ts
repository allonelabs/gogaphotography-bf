import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { buildHotelListQuery } from "../_query";
import { z } from "zod";

/**
 * GET /api/hotels/export — streams an XLSX of the user's org's hotels.
 *
 * Filter shape matches `/api/hotels` list endpoint (`search`, `countryId`,
 * `minStars`, `hotelGroupId`). Always exports ALL matching rows (paged
 * internally; the export ignores `pageSize` and pulls up to 5000 hotels).
 *
 * Column order is the legacy 25-column UPLOAD HOTEL.xls shape — same
 * keys the import endpoint accepts, so an export → re-import is a
 * round-trip.
 */
const ExportSchema = z.object({
  search: z.string().default(""),
  minStars: z.coerce.number().int().min(0).max(5).optional(),
  countryId: z.coerce.number().int().optional(),
  hotelGroupId: z.coerce.number().int().optional(),
  sort: z.enum(["name", "hotel_range", "id"]).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
});

const LEGACY_COLUMNS = [
  "name",
  "type",
  "juridical_form",
  "hotel_group",
  "full_name",
  "identification",
  "country",
  "region",
  "city",
  "comment",
  "hotel_range",
  "contact_name",
  "contact_company",
  "contact_position",
  "contact_email",
  "address",
  "juridical_address",
  "telephone",
  "mobile",
  "other_contact_info",
  "bank_code",
  "corr_account",
  "currency",
  "bank_name",
  "swift_code",
] as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = ExportSchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  }

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

  // Reuse the list-query builder but override paging to grab everything.
  const q = buildHotelListQuery({
    ...parsed.data,
    page: 1,
    pageSize: 5000,
  });

  let query = (supabase as any)
    .from("hotel")
    .select(
      `
      id, name, type, full_name, identification, comment, hotel_range, main_contact_id,
      juridical:c_juridical_form(name),
      group:c_hotel_group(name),
      country:cc1_country(name),
      region:cc1_region(name),
      city:cc1_city(name),
      main_contact:hotel_contact!main_contact_id(name, role, email, phone)
    `,
    )
    .eq("organization_id", orgId)
    .order(q.order.column, { ascending: q.order.ascending })
    .range(q.range.from, q.range.to);

  for (const f of q.filters) {
    query = (query as any)[f.op](f.column, f.value);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }

  // Pull bank-account info in a single second query keyed by hotel_id,
  // then map onto the row set. (One bank per hotel in the legacy export.)
  const hotelIds = (data ?? []).map((r: any) => r.id);
  const bankByHotel = new Map<number, any>();
  if (hotelIds.length > 0) {
    const { data: banks } = await (supabase as any)
      .from("hotel_bank_account")
      .select("hotel_id, bank, account_number, currency, swift")
      .in("hotel_id", hotelIds);
    for (const b of banks ?? []) {
      if (!bankByHotel.has(b.hotel_id)) bankByHotel.set(b.hotel_id, b);
    }
  }

  // Map joined rows to the legacy column shape. Missing values are "".
  const rows = (data ?? []).map((r: any) => {
    const c = r.main_contact ?? {};
    const b = bankByHotel.get(r.id) ?? {};
    const row: Record<string, string | number | null> = {
      name: r.name ?? "",
      type: r.type ?? 1,
      juridical_form: r.juridical?.name ?? "",
      hotel_group: r.group?.name ?? "",
      full_name: r.full_name ?? "",
      identification: r.identification ?? "",
      country: r.country?.name ?? "",
      region: r.region?.name ?? "",
      city: r.city?.name ?? "",
      comment: r.comment ?? "",
      hotel_range: r.hotel_range ?? 0,
      contact_name: c.name ?? "",
      contact_company: "",
      contact_position: c.role ?? "",
      contact_email: c.email ?? "",
      address: "",
      juridical_address: "",
      telephone: c.phone ?? "",
      mobile: "",
      other_contact_info: "",
      bank_code: "",
      corr_account: b.account_number ?? "",
      currency: b.currency ?? "",
      bank_name: b.bank ?? "",
      swift_code: b.swift ?? "",
    };
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: [...LEGACY_COLUMNS] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hotels");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const today = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hotels-${today}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
