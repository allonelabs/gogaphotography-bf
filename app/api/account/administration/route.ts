/**
 * Lightweight read-only listing of `administration` for client-pick
 * autocomplete in order/refund forms.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

const ListSchema = z.object({
  search: z.string().default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
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
  const { search, page, pageSize } = parsed.data;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const supabase = (await createServerSupabaseClient()) as any;
  let q = supabase
    .from("administration")
    .select("id, first_name, last_name, mail, mobile1", { count: "exact" })
    .order("id", { ascending: false })
    .range(from, to);
  if (search) {
    const term = `%${search}%`;
    q = q.or(
      `first_name.ilike.${term},last_name.ilike.${term},mail.ilike.${term}`,
    );
  }
  const { data, count, error } = await q;
  if (error) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, data, total: count ?? 0 });
}
