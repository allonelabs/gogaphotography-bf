/**
 * GET /api/audit
 *
 * Reads recent audit_log rows with filters. Permission: audit.read (only
 * admins by default).
 *
 * Query params:
 *   - actor    filter by actor_email (ilike)
 *   - table    filter by table_name (eq)
 *   - action   filter by action (eq) — insert | update | delete
 *   - from     ISO date — occurred_at >= from
 *   - to       ISO date — occurred_at <= to
 *   - page     int >= 1
 *   - pageSize int 1..200, default 50
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { requireApiPermission } from "@/app/lib/auth/permissions";

const QuerySchema = z.object({
  actor: z.string().optional(),
  table: z.string().optional(),
  action: z.enum(["insert", "update", "delete"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export async function GET(req: Request) {
  const fail = await requireApiPermission("audit.read");
  if (fail) return fail;
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  }
  const { actor, table, action, from, to, page, pageSize } = parsed.data;
  const lo = (page - 1) * pageSize;
  const hi = lo + pageSize - 1;
  const supabase = (await createServerSupabaseClient()) as any;
  let q = supabase
    .from("audit_log")
    .select(
      "id, occurred_at, actor_email, action, table_name, row_id, before, after, diff",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(lo, hi);
  if (actor) q = q.ilike("actor_email", `%${actor}%`);
  if (table) q = q.eq("table_name", table);
  if (action) q = q.eq("action", action);
  if (from) q = q.gte("occurred_at", from);
  if (to) q = q.lte("occurred_at", to);
  const { data, count, error } = await q;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, data, total: count ?? 0 });
}
