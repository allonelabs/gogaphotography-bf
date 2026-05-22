/**
 * Single-column lookup catalog factory.
 *
 * Each vertical has at least one `c_*_group` (or category) table — same
 * shape as c_hotel_group. This factory builds list/create/update/delete
 * handlers for any such table by name.
 *
 * Tables with extra columns (cc2_transport_model has cc2_transport_mark_id)
 * pass `extraCols` to expose them.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";

export interface CatalogOpts {
  table: string;
  /** Extra columns beyond `id`/`name`. */
  extraCols?: Record<string, z.ZodTypeAny>;
  /** Server-side filter column (e.g. `cc2_transport_mark_id` for models). */
  filterColumn?: string;
  /** Request param name that maps to filterColumn. Defaults to filterColumn. */
  filterParam?: string;
  /**
   * Permission codes for the write/delete handlers. Defaults to
   * `catalogs.write` / `catalogs.delete` (the seeded codes from migration
   * 0004). Set explicitly to override per-catalog.
   */
  permissions?: {
    write?: string;
    delete?: string;
  };
}

function bad(message: string, status = 400) {
  return NextResponse.json(
    { ok: false, error: { code: "bad_input", message } },
    { status },
  );
}

function db(message: string, status = 500) {
  return NextResponse.json(
    { ok: false, error: { code: "db", message } },
    { status },
  );
}

export function createCatalogHandlers(opts: CatalogOpts) {
  const extras = opts.extraCols ?? {};
  const insertSchema = z.object({
    name: z.string().min(1),
    ...Object.fromEntries(
      Object.entries(extras).map(([k, v]) => [k, v.optional()]),
    ),
  });
  const patchSchema = z
    .object({
      name: z.string().min(1).optional(),
      ...Object.fromEntries(
        Object.entries(extras).map(([k, v]) => [k, v.optional()]),
      ),
    })
    .partial();

  const selectCols = ["id", "name", ...Object.keys(extras)].join(", ");
  const filterParam = opts.filterParam ?? opts.filterColumn ?? "";

  // Default catalogs to the seeded `catalogs.write` / `catalogs.delete` codes
  // unless an override is supplied. Pass `permissions: { write: undefined }`
  // to opt out (not recommended).
  const writeCode =
    opts.permissions && "write" in opts.permissions
      ? opts.permissions.write
      : "catalogs.write";
  const deleteCode =
    opts.permissions && "delete" in opts.permissions
      ? opts.permissions.delete
      : "catalogs.delete";

  const listGET = async (req: Request) => {
    const url = new URL(req.url);
    const supabase = (await createServerSupabaseClient()) as any;
    let q = supabase.from(opts.table).select(selectCols).order("name");
    if (opts.filterColumn && filterParam) {
      const v = url.searchParams.get(filterParam);
      if (v != null && v !== "") {
        q = (q as any).eq(opts.filterColumn, Number(v));
      }
    }
    const { data, error } = await q;
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const POST = async (req: Request) => {
    if (writeCode) {
      const fail = await requireApiPermission(writeCode);
      if (fail) return fail;
    }
    const body = await req.json();
    const parsed = insertSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const supabase = (
      writeCode
        ? await createServerSupabaseClientWithAudit()
        : await createServerSupabaseClient()
    ) as any;
    const { data, error } = await supabase
      .from(opts.table)
      .insert(parsed.data)
      .select()
      .single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const itemPATCH = async (
    req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    if (writeCode) {
      const fail = await requireApiPermission(writeCode);
      if (fail) return fail;
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const supabase = (
      writeCode
        ? await createServerSupabaseClientWithAudit()
        : await createServerSupabaseClient()
    ) as any;
    const { data, error } = await supabase
      .from(opts.table)
      .update(parsed.data)
      .eq("id", Number(id))
      .select()
      .single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const itemDELETE = async (
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
  ) => {
    if (deleteCode) {
      const fail = await requireApiPermission(deleteCode);
      if (fail) return fail;
    }
    const { id } = await params;
    const supabase = (
      deleteCode
        ? await createServerSupabaseClientWithAudit()
        : await createServerSupabaseClient()
    ) as any;
    const { error } = await supabase
      .from(opts.table)
      .delete()
      .eq("id", Number(id));
    if (error) return db(error.message);
    return NextResponse.json({ ok: true });
  };

  return { listGET, POST, itemPATCH, itemDELETE };
}
