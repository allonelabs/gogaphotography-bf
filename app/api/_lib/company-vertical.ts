/**
 * Per-vertical zod schemas + CRUD handlers for the 5 company-like verticals.
 * Reduces 5 × 2 route files of near-duplicate boilerplate to one config.
 */
import { z } from "zod";
import {
  companyVerticalCore,
  contactCore,
  bankAccountCore,
  balanceCore,
  createCrudHandlers,
} from "./crud-route";
import {
  createSubEntityHandlers,
  createListOnlyHandlers,
} from "./sub-entity-route";

export interface CompanyVerticalConfig {
  /** DB table name (singular, legacy-style). E.g. `avia`. */
  table: string;
  /** Catalog group FK column on the main table. E.g. `c_avia_group_id`. */
  groupColumn: string;
  /** Catalog group table name. E.g. `c_avia_group`. */
  groupTable: string;
  /** Whether this vertical has a `code` text column (consul doesn't). */
  hasCode?: boolean;
  /** Extra fields on the main table (transfer has text_en / text_ge / main_transfer_list_id). */
  extraFields?: Record<string, z.ZodTypeAny>;
}

/**
 * Permission base used to compute `<base>.write` / `<base>.delete` codes for
 * each vertical. `ensure` is the insurance table; the seeded permission code
 * is `insurance.*`, not `ensure.*` — kept aligned with migration 0004.
 */
const PERMISSION_BASE: Record<string, string> = {
  avia: "avia",
  transfer: "transfer",
  consul: "consul",
  ensure: "insurance",
  excursion: "excursion",
};

const CFGS: Record<string, CompanyVerticalConfig> = {
  avia: {
    table: "avia",
    groupColumn: "c_avia_group_id",
    groupTable: "c_avia_group",
    hasCode: true,
  },
  transfer: {
    table: "transfer",
    groupColumn: "c_transfer_group_id",
    groupTable: "c_transfer_group",
    hasCode: true,
    extraFields: {
      text_en: z.string().nullable().optional(),
      text_ge: z.string().nullable().optional(),
      main_transfer_list_id: z.number().int().nullable().optional(),
    },
  },
  consul: {
    table: "consul",
    groupColumn: "c_consul_group_id",
    groupTable: "c_consul_group",
    hasCode: false,
  },
  ensure: {
    table: "ensure",
    groupColumn: "c_ensure_group_id",
    groupTable: "c_ensure_group",
    hasCode: true,
  },
  excursion: {
    table: "excursion",
    groupColumn: "c_excursion_group_id",
    groupTable: "c_excursion_group",
    hasCode: true,
  },
};

/** Build CRUD handlers for one company-like vertical by name. */
export function companyVerticalHandlers(name: keyof typeof CFGS) {
  const cfg = CFGS[name];
  if (!cfg) throw new Error(`Unknown vertical: ${String(name)}`);
  const permBase = PERMISSION_BASE[name as string] ?? (name as string);
  const writeCode = `${permBase}.write`;
  const deleteCode = `${permBase}.delete`;

  const core: Record<string, z.ZodTypeAny> = {
    ...companyVerticalCore,
    [cfg.groupColumn]: z.number().int().nullable().optional(),
    main_contact_id: z.number().int().nullable().optional(),
    main_bank_account_id: z.number().int().nullable().optional(),
    ...(cfg.extraFields ?? {}),
  };
  if (!cfg.hasCode) {
    delete core.code;
  }

  const insertSchema = z.object(core);
  const patchSchema = z
    .object(
      Object.fromEntries(
        Object.entries(core).map(([k, v]) => [
          k,
          (v as z.ZodTypeAny).optional(),
        ]),
      ),
    )
    .partial();

  // Embedded selects: name, country, region, city, group, juridical
  const groupAlias = "group";
  const selectList = `
    id, name, ${cfg.groupColumn}, full_name, identification,
    cc1_country_id, cc1_region_id, cc1_city_id, comment,
    ${cfg.hasCode ? "code," : ""}
    ${groupAlias}:${cfg.groupTable}(name),
    country:cc1_country(name),
    city:cc1_city(name)
  `;
  const selectDetail = `*, ${groupAlias}:${cfg.groupTable}(*), country:cc1_country(*), region:cc1_region(*), city:cc1_city(*), juridical:c_juridical_form(*)`;

  const main = createCrudHandlers({
    table: cfg.table,
    filterCols: [cfg.groupColumn, "cc1_country_id"],
    insertSchema,
    patchSchema,
    selectList,
    selectDetail,
    permissions: { write: writeCode, delete: deleteCode },
  });

  const parentCol = `${cfg.table}_id`;

  // Sub-entity writes (contacts, banks) gate on the parent vertical's write
  // permission — managing a company's contacts is part of editing the
  // company itself, not a separate scope.
  const contactInsert = z.object({ ...contactCore });
  const contactPatch = z.object({ ...contactCore }).partial();
  const contacts = createSubEntityHandlers({
    table: `${cfg.table}_contact`,
    parentColumn: parentCol,
    insertSchema: contactInsert,
    patchSchema: contactPatch,
    permissions: { write: writeCode, delete: writeCode },
  });

  const bankInsert = z.object({ ...bankAccountCore });
  const bankPatch = z.object({ ...bankAccountCore }).partial();
  const banks = createSubEntityHandlers({
    table: `${cfg.table}_bank_account`,
    parentColumn: parentCol,
    insertSchema: bankInsert,
    patchSchema: bankPatch,
    permissions: { write: writeCode, delete: writeCode },
  });

  const balance = createListOnlyHandlers({
    table: `${cfg.table}_balance`,
    parentColumn: parentCol,
    orderBy: { column: "set_date", ascending: false },
  });

  return { main, contacts, banks, balance };
}
