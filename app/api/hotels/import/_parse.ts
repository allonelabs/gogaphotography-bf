import * as XLSX from "xlsx";
import { z } from "zod";

/**
 * Hotel import row schema.
 *
 * Accepts both the "simple" shape used by the dev UI and the "legacy" shape
 * lifted from `UPLOAD HOTEL.xls` (the spreadsheet TravelPlace admins have
 * used for ~10 years). The legacy shape is 25 columns; we keep the names
 * verbose to match the file the admin team already has.
 *
 * For FK columns (`juridical_form`, `hotel_group`, `country`, `region`,
 * `city`) we keep the value as text — the route handler resolves text to
 * catalog IDs (and upserts missing rows) via `_resolver.ts`.
 */
const Row = z
  .object({
    name: z.string().min(1),
    type: z.coerce.number().int().min(0).max(1).optional(),
    full_name: z.string().nullable().optional(),
    identification: z.string().nullable().optional(),
    comment: z.string().nullable().optional(),
    hotel_range: z.coerce.number().int().min(0).max(5).optional(),
    // FK lookups by name happen during insert — these accept text or id
    juridical_form: z.string().nullable().optional(),
    hotel_group: z.string().nullable().optional(),
    country: z.string().nullable().optional(),
    region: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    // Optional contact + bank columns from the legacy template — captured
    // so the route handler can create the corresponding child rows.
    contact_name: z.string().nullable().optional(),
    contact_company: z.string().nullable().optional(),
    contact_position: z.string().nullable().optional(),
    contact_email: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    juridical_address: z.string().nullable().optional(),
    telephone: z.string().nullable().optional(),
    mobile: z.string().nullable().optional(),
    other_contact_info: z.string().nullable().optional(),
    bank_code: z.string().nullable().optional(),
    corr_account: z.string().nullable().optional(),
    currency: z.string().nullable().optional(),
    bank_name: z.string().nullable().optional(),
    swift_code: z.string().nullable().optional(),
  })
  .passthrough();

export type HotelImportRow = z.infer<typeof Row>;

export interface ParseResult {
  rows: HotelImportRow[];
  errors: { row: number; message: string }[];
}

/**
 * Maps legacy template header labels (and common variants) onto our
 * canonical row keys. The keys here are lowercased + trimmed, so a
 * comparison is just `aliasMap[normalize(header)]`.
 */
const HEADER_ALIASES: Record<string, keyof HotelImportRow> = {
  // Identity
  "hotel name": "name",
  name: "name",
  jurisdicial: "type", // legacy column A — 1 = juridical, 0 = natural person
  type: "type",
  "full name": "full_name",
  full_name: "full_name",
  "i/n": "identification",
  "i.n": "identification",
  "id number": "identification",
  identification: "identification",
  comment: "comment",
  stars: "hotel_range",
  hotel_range: "hotel_range",
  // Catalog refs (text → id resolved at insert time)
  "jurisdicial form": "juridical_form",
  "juridical form": "juridical_form",
  juridical_form: "juridical_form",
  cathegory: "hotel_group", // sic: legacy spelling
  category: "hotel_group",
  "hotel group": "hotel_group",
  hotel_group: "hotel_group",
  country: "country",
  region: "region",
  city: "city",
  // Contacts (single primary contact from the legacy spreadsheet row)
  "cont. name": "contact_name",
  "contact name": "contact_name",
  company: "contact_company",
  position: "contact_position",
  "e-mail": "contact_email",
  email: "contact_email",
  address: "address",
  "jur. adress": "juridical_address",
  "jur. address": "juridical_address",
  "juridical address": "juridical_address",
  telephone: "telephone",
  phone: "telephone",
  mobile: "mobile",
  "other contact info": "other_contact_info",
  // Bank
  "bank code": "bank_code",
  "corr. acc": "corr_account",
  "corr account": "corr_account",
  currency: "currency",
  "bank name": "bank_name",
  "swift code": "swift_code",
  swift: "swift_code",
};

function normalizeKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Map raw object keys → canonical keys; leave unrecognized keys untouched. */
function remapRow(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const canonical = HEADER_ALIASES[normalizeKey(k)];
    const targetKey = canonical ?? k;
    // Treat blank strings as null so optional fields stay optional
    if (typeof v === "string" && v.trim() === "") {
      out[targetKey] = null;
    } else {
      out[targetKey] = v;
    }
  }
  return out;
}

/** A row is empty if all values are null / blank-ish. Skip silently. */
function isEmptyRow(r: Record<string, unknown>): boolean {
  return Object.values(r).every(
    (v) => v == null || (typeof v === "string" && v.trim() === ""),
  );
}

export function parseHotelExcel(buffer: Buffer | ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: null,
  });

  const rows: HotelImportRow[] = [];
  const errors: ParseResult["errors"] = [];
  raw.forEach((r, i) => {
    if (isEmptyRow(r)) return;
    const mapped = remapRow(r);
    const parsed = Row.safeParse(mapped);
    if (parsed.success) rows.push(parsed.data);
    else
      errors.push({
        row: i + 1,
        message: parsed.error.issues[0]?.message ?? "invalid",
      });
  });

  return { rows, errors };
}
