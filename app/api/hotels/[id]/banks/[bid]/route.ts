import { NextResponse } from "next/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { z } from "zod";

const PatchSchema = z.object({
  bank: z.string().min(1).optional(),
  account_number: z.string().min(1).optional(),
  iban: z.string().nullable().optional(),
  swift: z.string().nullable().optional(),
  currency: z.string().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; bid: string }> },
) {
  const fail = await requireApiPermission("hotels.write");
  if (fail) return fail;
  const { bid } = await params;
  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
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
    .update(parsed.data)
    .eq("id", Number(bid))
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; bid: string }> },
) {
  const fail = await requireApiPermission("hotels.delete");
  if (fail) return fail;
  const { bid } = await params;
  const supabase = await createServerSupabaseClientWithAudit();
  const { error } = await (supabase as any)
    .from("hotel_bank_account")
    .delete()
    .eq("id", Number(bid));
  if (error)
    return NextResponse.json(
      { ok: false, error: { code: "db", message: error.message } },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
