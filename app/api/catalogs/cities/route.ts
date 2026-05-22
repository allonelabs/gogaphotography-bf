import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { z } from "zod";

const CreateSchema = z.object({
  name: z.string().min(1),
  cc1_region_id: z.number().int().nullable().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const regionIdRaw = url.searchParams.get("region_id");
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Math.min(5000, Math.max(1, Number(limitRaw))) : 5000;
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("cc1_city")
    .select("id, name, cc1_region_id")
    .order("name")
    .limit(limit);
  if (regionIdRaw) {
    query = query.eq("cc1_region_id", Number(regionIdRaw));
  }
  const { data, error } = await query;
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const fail = await requireApiPermission("catalogs.write");
  if (fail) return fail;
  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      {
        ok: false,
        error: { code: "bad_input", message: parsed.error.message },
      },
      { status: 400 },
    );
  const supabase = await createServerSupabaseClientWithAudit();
  const { data, error } = await (supabase as any)
    .from("cc1_city")
    .insert(parsed.data)
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}
