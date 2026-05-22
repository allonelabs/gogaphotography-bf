import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { parseHotelExcel, type HotelImportRow } from "./_parse";
import { createResolver } from "./_resolver";
import type { Database } from "@/app/lib/db/types";

type HotelInsert = Database["public"]["Tables"]["hotel"]["Insert"];
type HotelContactInsert =
  Database["public"]["Tables"]["hotel_contact"]["Insert"];
type HotelBankInsert =
  Database["public"]["Tables"]["hotel_bank_account"]["Insert"];

/**
 * POST /api/hotels/import — accepts an XLS/XLSX upload (form-data, key `file`).
 *
 * Pipeline:
 *  1. Parse + Zod-validate every row, collect errors (no partial DB writes
 *     until all rows pass).
 *  2. For each row, resolve catalog names → IDs via `createResolver`, which
 *     upserts any missing country / region / city / juridical form / hotel
 *     group rows.
 *  3. Bulk-insert the hotel rows in a single insert.
 *  4. Best-effort: write any primary contact + bank account child rows.
 *
 * Note: Supabase JS has no transactions client-side. We sequence so catalog
 * upserts happen first (idempotent — re-running with the same name returns
 * the existing id), then hotels, then children. Half-imports are still
 * possible on a mid-flight DB error but the catalog upserts are safe to
 * leave in place.
 */
export async function POST(req: Request) {
  const fail = await requireApiPermission("hotels.write");
  if (fail) return fail;
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: "Missing 'file' upload" },
      },
      { status: 400 },
    );
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = parseHotelExcel(buf);
  if (parsed.errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "row_errors",
          message: "Validation failed",
          rowErrors: parsed.errors,
          validRowCount: parsed.rows.length,
        },
      },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClientWithAudit();
  const resolver = createResolver(supabase);

  // Resolve FKs row-by-row (catalog upserts cached internally).
  const insertPayloads: Array<{
    row: HotelImportRow;
    hotel: HotelInsert;
  }> = [];
  try {
    for (const r of parsed.rows) {
      const countryId = await resolver.countryByName(r.country ?? null);
      const regionId = await resolver.regionByName(countryId, r.region ?? null);
      const cityId = await resolver.cityByName(regionId, r.city ?? null);
      const juridicalId = await resolver.juridicalFormByName(
        r.juridical_form ?? null,
      );
      const groupId = await resolver.hotelGroupByName(r.hotel_group ?? null);

      insertPayloads.push({
        row: r,
        hotel: {
          name: r.name,
          type: r.type ?? 1,
          full_name: r.full_name ?? null,
          identification: r.identification ?? null,
          comment: r.comment ?? null,
          hotel_range: r.hotel_range ?? 0,
          c_juridical_form_id: juridicalId,
          c_hotel_group_id: groupId,
          cc1_country_id: countryId,
          cc1_region_id: regionId,
          cc1_city_id: cityId,
        },
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "resolver_failed";
    return NextResponse.json(
      { ok: false, error: { code: "resolver", message } },
      { status: 500 },
    );
  }

  const { data: insertedHotels, error: insertErr } = await supabase
    .from("hotel")
    .insert(insertPayloads.map((p) => p.hotel))
    .select("id");

  if (insertErr) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: insertErr.message } },
      { status: 500 },
    );
  }

  // Best-effort: contact + bank rows when present. Pair by index — the
  // .insert order matches input order under PostgREST.
  const contactRows: HotelContactInsert[] = [];
  const bankRows: HotelBankInsert[] = [];
  insertPayloads.forEach((p, i) => {
    const hotelId = insertedHotels?.[i]?.id;
    if (!hotelId) return;
    const r = p.row;
    const hasContact =
      r.contact_name || r.contact_email || r.telephone || r.mobile;
    if (hasContact) {
      contactRows.push({
        hotel_id: hotelId,
        name: r.contact_name ?? null,
        role: r.contact_position ?? null,
        phone: r.telephone ?? r.mobile ?? null,
        email: r.contact_email ?? null,
        is_primary: true,
      });
    }
    const hasBank =
      r.bank_name || r.bank_code || r.corr_account || r.swift_code;
    if (hasBank) {
      bankRows.push({
        hotel_id: hotelId,
        bank: r.bank_name ?? null,
        account_number: r.corr_account ?? null,
        swift: r.swift_code ?? null,
        currency: r.currency ?? "GEL",
      });
    }
  });

  if (contactRows.length > 0) {
    await supabase.from("hotel_contact").insert(contactRows);
  }
  if (bankRows.length > 0) {
    await supabase.from("hotel_bank_account").insert(bankRows);
  }

  return NextResponse.json({
    ok: true,
    insertedCount: insertedHotels?.length ?? 0,
    createdCatalogs: resolver.stats,
  });
}
