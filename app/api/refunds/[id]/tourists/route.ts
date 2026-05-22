/**
 * /api/refunds/[id]/tourists — list / create travelers on a refund.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";

const InsertSchema = z.object({
  client_id: z.number().int().nullable().optional(),
  username: z.string().nullable().optional(),
  first_name: z.string().nullable().optional(),
  last_name: z.string().nullable().optional(),
  first_name_en: z.string().nullable().optional(),
  last_name_en: z.string().nullable().optional(),
  gender: z.number().int().nullable().optional(),
  birthday: z.string().nullable().optional(),
  mobile: z.string().nullable().optional(),
  mail: z.string().nullable().optional(),
  type: z.number().int().nullable().optional(),
  cc1_country: z.string().nullable().optional(),
  cc1_region: z.string().nullable().optional(),
  cc1_city: z.string().nullable().optional(),
  self_number: z.string().nullable().optional(),
  pasport_number: z.string().nullable().optional(),
});

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = (await createServerSupabaseClient()) as any;
  const { data, error } = await supabase
    .from("p_refund_tourist")
    .select("*")
    .eq("p_refund_id", Number(id))
    .order("id", { ascending: true });
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true, data, total: data?.length ?? 0 });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("refunds.write");
  if (fail) return fail;
  const { id } = await params;
  const body = await req.json();
  const parsed = InsertSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.message);
  const supabase = (await createServerSupabaseClientWithAudit()) as any;
  const { data, error } = await supabase
    .from("p_refund_tourist")
    .insert({ ...parsed.data, p_refund_id: Number(id) })
    .select()
    .single();
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true, data });
}
