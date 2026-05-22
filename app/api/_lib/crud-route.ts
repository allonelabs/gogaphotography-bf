/**
 * Generic CRUD route factory for the booking verticals.
 *
 * Each vertical has the same shape:
 *   - GET /api/<v>            list (search + filters + paging)
 *   - POST /api/<v>           create
 *   - GET /api/<v>/[id]       read
 *   - PATCH /api/<v>/[id]     update
 *   - DELETE /api/<v>/[id]    delete
 *
 * Build the handlers once per vertical from a config object instead of writing
 * 14 nearly-identical files by hand. This is the pattern hotel/route.ts +
 * hotel/[id]/route.ts use under the hood — extracted and made generic.
 *
 * Org-scoping: every handler runs through `createOrgScopedSupabaseClient`,
 * adds `.eq("organization_id", orgId)` to reads, and stamps `organization_id`
 * on inserts. Pass `orgScoped: false` (default true) for catalog-style tables
 * that are shared across organizations.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";

export interface CrudRouteOptions {
  /** Postgres table name */
  table: string;
  /**
   * Filter columns accepted on GET as `?<col>=<val>` (numeric eq filter).
   * Beyond these, GET always accepts `search` (ilike on `searchColumn`), and
   * standard `page` / `pageSize` / `sort` / `dir`.
   */
  filterCols?: string[];
  /** Column used for free-text search (ilike `%<q>%`). Default `name`. */
  searchColumn?: string;
  /** Columns allowed as `?sort=`. Default `["name", "id"]`. */
  sortCols?: string[];
  /** Default sort column / direction. */
  defaultSort?: { column: string; ascending: boolean };
  /**
   * Zod schema for POST body. Inferred type is what gets inserted.
   * Use `.strict()` to catch unexpected fields.
   */
  insertSchema: z.ZodTypeAny;
  /** Zod schema for PATCH body — all fields optional, no required check. */
  patchSchema: z.ZodTypeAny;
  /**
   * Optional select() expression for list and detail. Use this to embed
   * related catalog rows (e.g. `country:cc1_country(name)`).
   */
  selectList?: string;
  selectDetail?: string;
  /** Hard cap on pageSize. Default 200. */
  maxPageSize?: number;
  /**
   * Permission codes to enforce on the write handlers. When set, POST /
   * PATCH require `permissions.write` and DELETE requires
   * `permissions.delete`. GET stays open (read access is gated elsewhere
   * — sidebar / page-level). When a write handler runs, it also threads
   * the actor email into the audit GUC via the with-actor client.
   */
  permissions?: {
    write?: string;
    delete?: string;
  };
  /**
   * If true (default), the table is org-scoped: reads filter by
   * `organization_id = session.org_id` and inserts stamp it. Set false for
   * catalog tables (countries, regions, cities, juridical forms) that are
   * shared across organizations.
   */
  orgScoped?: boolean;
}

export interface CrudHandlers {
  listGET: (req: Request) => Promise<NextResponse>;
  POST: (req: Request) => Promise<NextResponse>;
  itemGET: (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<NextResponse>;
  PATCH: (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<NextResponse>;
  DELETE: (
    req: Request,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<NextResponse>;
}

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function db(message: string, status = 500) {
  return NextResponse.json(
    { ok: false, error: { code: "db", message } },
    { status },
  );
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

export function createCrudHandlers(opts: CrudRouteOptions): CrudHandlers {
  const searchColumn = opts.searchColumn ?? "name";
  const sortCols = opts.sortCols ?? ["name", "id"];
  const defaultSort = opts.defaultSort ?? {
    column: sortCols[0],
    ascending: true,
  };
  const filterCols = opts.filterCols ?? [];
  const maxPageSize = opts.maxPageSize ?? 200;
  const selectList = opts.selectList ?? "*";
  const selectDetail = opts.selectDetail ?? "*";
  const orgScoped = opts.orgScoped !== false;

  const ListSchema = z.object({
    search: z.string().default(""),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(maxPageSize).default(50),
    sort: z.enum(sortCols as [string, ...string[]]).optional(),
    dir: z.enum(["asc", "desc"]).optional(),
  });

  // Helper: get a (supabase, orgId) pair. For non-org-scoped tables,
  // orgId is undefined.
  async function getClient(
    write: boolean,
  ): Promise<
    | { ok: true; supabase: any; orgId: number | undefined }
    | { ok: false; res: NextResponse }
  > {
    if (orgScoped) {
      try {
        const scoped = await createOrgScopedSupabaseClient();
        return {
          ok: true,
          supabase: scoped.client as any,
          orgId: scoped.orgId,
        };
      } catch (e) {
        return { ok: false, res: unauth((e as Error).message) };
      }
    }
    const client = write
      ? await createServerSupabaseClientWithAudit()
      : await createServerSupabaseClient();
    return { ok: true, supabase: client as any, orgId: undefined };
  }

  const listGET = async (req: Request) => {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams);
    const parsed = ListSchema.safeParse(params);
    if (!parsed.success) return bad(parsed.error.message);

    const { search, page, pageSize, sort, dir } = parsed.data;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const got = await getClient(false);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let query = supabase
      .from(opts.table)
      .select(selectList, { count: "exact" })
      .order(sort ?? defaultSort.column, {
        ascending: (dir ?? (defaultSort.ascending ? "asc" : "desc")) === "asc",
      })
      .range(from, to);

    if (orgScoped && orgId !== undefined) {
      query = (query as any).eq("organization_id", orgId);
    }
    if (search) {
      query = (query as any).ilike(searchColumn, `%${search}%`);
    }
    for (const col of filterCols) {
      const v = url.searchParams.get(col);
      if (v != null && v !== "") {
        query = (query as any).eq(col, Number.isNaN(Number(v)) ? v : Number(v));
      }
    }

    const { data, count, error } = await query;
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data, total: count ?? 0 });
  };

  const POST = async (req: Request) => {
    if (opts.permissions?.write) {
      const fail = await requireApiPermission(opts.permissions.write);
      if (fail) return fail;
    }
    const body = await req.json();
    const parsed = opts.insertSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    const payload =
      orgScoped && orgId !== undefined
        ? {
            ...(parsed.data as Record<string, unknown>),
            organization_id: orgId,
          }
        : (parsed.data as Record<string, unknown>);
    const { data, error } = await supabase
      .from(opts.table)
      .insert(payload)
      .select()
      .single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const itemGET = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    const { id } = await params;
    const got = await getClient(false);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase.from(opts.table).select(selectDetail).eq("id", Number(id));
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { data, error } = await q.single();
    if (error) return bad(error.message, "not_found", 404);
    return NextResponse.json({ ok: true, data });
  };

  const PATCH = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    if (opts.permissions?.write) {
      const fail = await requireApiPermission(opts.permissions.write);
      if (fail) return fail;
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = opts.patchSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase
      .from(opts.table)
      .update(parsed.data as Record<string, unknown>)
      .eq("id", Number(id));
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { data, error } = await q.select().single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const DELETE = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    if (opts.permissions?.delete) {
      const fail = await requireApiPermission(opts.permissions.delete);
      if (fail) return fail;
    }
    const { id } = await params;
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase.from(opts.table).delete().eq("id", Number(id));
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { error } = await q;
    if (error) return db(error.message);
    return NextResponse.json({ ok: true });
  };

  return { listGET, POST, itemGET, PATCH, DELETE };
}

// ─── Reusable zod fragments ────────────────────────────────────────────────

/** Company-like vertical insert/patch fields shared by avia/transfer/consul/ensure/excursion. */
export const companyVerticalCore = {
  name: z.string().min(1),
  type: z.number().int().min(0).max(1).optional(),
  c_juridical_form_id: z.number().int().nullable().optional(),
  full_name: z.string().nullable().optional(),
  identification: z.string().nullable().optional(),
  cc1_country_id: z.number().int().nullable().optional(),
  cc1_region_id: z.number().int().nullable().optional(),
  cc1_city_id: z.number().int().nullable().optional(),
  comment: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
};

/** Sub-entity (contact / bank / balance) helpers — built per vertical. */
export const contactCore = {
  name: z.string().nullable().optional(),
  company: z.string().nullable().optional(),
  position: z.string().nullable().optional(),
  mail: z.string().email().nullable().optional().or(z.literal("")),
  address: z.string().nullable().optional(),
  juridical_address: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  info: z.string().nullable().optional(),
  main: z.boolean().optional(),
};

export const bankAccountCore = {
  bank_code: z.string().nullable().optional(),
  a_a: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  swift: z.string().nullable().optional(),
  main: z.boolean().optional(),
};

export const balanceCore = {
  set_date: z.string().nullable().optional(),
  c_pay_prescript: z.string().nullable().optional(),
  arrears: z.number().nullable().optional(),
  pay: z.number().nullable().optional(),
  document_number: z.string().nullable().optional(),
  type: z.number().int().nullable().optional(),
  pay_type: z.number().int().nullable().optional(),
  invoice_number: z.string().nullable().optional(),
  p_order_id: z.number().int().nullable().optional(),
  currency_id: z.number().int().nullable().optional(),
  currency_name: z.string().nullable().optional(),
  currency_cource: z.number().nullable().optional(),
};
