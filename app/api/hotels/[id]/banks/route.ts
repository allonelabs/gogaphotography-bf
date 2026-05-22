import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { z } from "zod";

const CreateSchema = z.object({
  bank: z.string().min(1),
  account_number: z.string().min(1),
  iban: z.string().nullable().optional(),
  swift: z.string().nullable().optional(),
  currency: z.string().default("GEL"),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("hotel_bank_account")
    .select("*")
    .eq("hotel_id", Number(id))
    .order("id");
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("hotels.write");
  if (fail) return fail;
  const { id } = await params;
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
    .from("hotel_bank_account")
    .insert({ ...parsed.data, hotel_id: Number(id) })
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}
