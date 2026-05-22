/**
 * Generic factory for sub-entity routes:
 *   GET    /api/<v>/[id]/<sub>             list children of parent <id>
 *   POST   /api/<v>/[id]/<sub>             create child belonging to parent <id>
 *   PATCH  /api/<v>/[id]/<sub>/[childId]   update one child
 *   DELETE /api/<v>/[id]/<sub>/[childId]   delete one child
 *
 * Reads-only variant (e.g. balance, where history is append-only) just skip
 * POST / PATCH / DELETE by using `createListOnlyHandlers`.
 *
 * Org-scoping: child tables carry their own `organization_id` column, so we
 * filter selects/updates/deletes by it and stamp it on inserts. Set
 * `orgScoped: false` for sub-entity tables that aren't tenant-scoped (none
 * currently, but kept symmetric with crud-route).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";

export interface SubEntityOptions {
  /** Child table — e.g. `avia_contact`. */
  table: string;
  /** Column on child that points at parent — e.g. `avia_id`. */
  parentColumn: string;
  /** Zod for creating a child (parent_id is set automatically). */
  insertSchema: z.ZodTypeAny;
  /** Zod for patching a child. */
  patchSchema: z.ZodTypeAny;
  /** Order on list (default `id` asc). */
  orderBy?: { column: string; ascending: boolean };
  /**
   * Permission codes to enforce on the write handlers. POST/PATCH require
   * `permissions.write`; DELETE requires `permissions.delete`. Writes also
   * thread the actor email through the audit GUC.
   */
  permissions?: {
    write?: string;
    delete?: string;
  };
  /**
   * If true (default), the child table is org-scoped: filter by
   * organization_id on reads / updates / deletes; stamp on inserts.
   */
  orgScoped?: boolean;
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

export function createSubEntityHandlers(opts: SubEntityOptions) {
  const orderBy = opts.orderBy ?? { column: "id", ascending: true };
  const orgScoped = opts.orgScoped !== false;

  // Use `any` for the route ctx so Next.js can narrow params per-route
  // (childId names: cid, bid, etc.).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Ctx = { params: Promise<any> };

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

  const listGET = async (_req: Request, { params }: Ctx) => {
    const { id } = await params;
    const got = await getClient(false);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase
      .from(opts.table)
      .select("*")
      .eq(opts.parentColumn, Number(id))
      .order(orderBy.column, { ascending: orderBy.ascending });
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { data, error } = await q;
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const POST = async (req: Request, { params }: Ctx) => {
    if (opts.permissions?.write) {
      const fail = await requireApiPermission(opts.permissions.write);
      if (fail) return fail;
    }
    const { id } = await params;
    const body = await req.json();
    const parsed = opts.insertSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    const payload: Record<string, unknown> = {
      ...(parsed.data as Record<string, unknown>),
      [opts.parentColumn]: Number(id),
    };
    if (orgScoped && orgId !== undefined) {
      payload.organization_id = orgId;
    }
    const { data, error } = await supabase
      .from(opts.table)
      .insert(payload)
      .select()
      .single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const PATCH = async (req: Request, { params }: Ctx) => {
    if (opts.permissions?.write) {
      const fail = await requireApiPermission(opts.permissions.write);
      if (fail) return fail;
    }
    const p = (await params) as Record<string, string>;
    // Child id parameter name varies (cid, bid, ...). Pick the first non-`id`.
    const childId =
      p.childId ??
      p.cid ??
      p.bid ??
      Object.entries(p).find(([k]) => k !== "id")?.[1] ??
      "";
    if (!childId) return bad("child id missing", "bad_path", 400);
    const body = await req.json();
    const parsed = opts.patchSchema.safeParse(body);
    if (!parsed.success) return bad(parsed.error.message);
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase
      .from(opts.table)
      .update(parsed.data as Record<string, unknown>)
      .eq("id", Number(childId));
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { data, error } = await q.select().single();
    if (error) return db(error.message);
    return NextResponse.json({ ok: true, data });
  };

  const DELETE = async (_req: Request, { params }: Ctx) => {
    if (opts.permissions?.delete) {
      const fail = await requireApiPermission(opts.permissions.delete);
      if (fail) return fail;
    }
    const p = await params;
    const childId =
      p.childId ??
      p.cid ??
      p.bid ??
      Object.entries(p).find(([k]) => k !== "id")?.[1] ??
      "";
    if (!childId) return bad("child id missing", "bad_path", 400);
    const got = await getClient(true);
    if (!got.ok) return got.res;
    const { supabase, orgId } = got;
    let q = supabase.from(opts.table).delete().eq("id", Number(childId));
    if (orgScoped && orgId !== undefined) {
      q = (q as any).eq("organization_id", orgId);
    }
    const { error } = await q;
    if (error) return db(error.message);
    return NextResponse.json({ ok: true });
  };

  return { listGET, POST, PATCH, DELETE };
}

/** History-only variant (balance) — list endpoint only. */
export function createListOnlyHandlers(opts: {
  table: string;
  parentColumn: string;
  select?: string;
  orderBy?: { column: string; ascending: boolean };
  orgScoped?: boolean;
}) {
  const select = opts.select ?? "*";
  const orderBy = opts.orderBy ?? { column: "id", ascending: false };
  const orgScoped = opts.orgScoped !== false;
  return {
    listGET: async (
      _req: Request,
      { params }: { params: Promise<{ id: string }> },
    ) => {
      const { id } = await params;
      let supabase: any;
      let orgId: number | undefined;
      if (orgScoped) {
        try {
          const scoped = await createOrgScopedSupabaseClient();
          supabase = scoped.client as any;
          orgId = scoped.orgId;
        } catch (e) {
          return unauth((e as Error).message);
        }
      } else {
        supabase = (await createServerSupabaseClient()) as any;
      }
      let q = supabase
        .from(opts.table)
        .select(select)
        .eq(opts.parentColumn, Number(id))
        .order(orderBy.column, { ascending: orderBy.ascending });
      if (orgScoped && orgId !== undefined) {
        q = (q as any).eq("organization_id", orgId);
      }
      const { data, error } = await q;
      if (error) return db(error.message);
      return NextResponse.json({ ok: true, data });
    },
  };
}
