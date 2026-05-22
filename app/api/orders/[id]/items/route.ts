/**
 * POST /api/orders/[id]/items
 *
 * Adds a line item to an order. Body must include `vertical` (hotel | avia |
 * transfer | excursion | ensure | visa | service) plus the vertical-specific
 * fields. The handler routes to the matching `p_order_<vertical>` table.
 *
 * GET returns all line items for the order, grouped by vertical.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { createServerSupabaseClientWithAudit } from "@/app/lib/supabase/with-actor";
import { requireApiPermission } from "@/app/lib/auth/permissions";

const VERTICALS = [
  "hotel",
  "avia",
  "transfer",
  "excursion",
  "ensure",
  "visa",
  "service",
] as const;
type Vertical = (typeof VERTICALS)[number];

const ItemSchema = z
  .object({
    vertical: z.enum(VERTICALS),
  })
  .passthrough();

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const fail = await requireApiPermission("orders.write");
  if (fail) return fail;
  const { id } = await params;
  const body = await req.json();
  const parsed = ItemSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.message);
  const { vertical, ...fields } = parsed.data as {
    vertical: Vertical;
  } & Record<string, unknown>;
  const supabase = (await createServerSupabaseClientWithAudit()) as any;
  const payload = { ...fields, p_order_id: Number(id) };
  const { data, error } = await supabase
    .from(`p_order_${vertical}`)
    .insert(payload)
    .select()
    .single();
  if (error) return bad(error.message, "db", 500);
  return NextResponse.json({ ok: true, data, vertical });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = (await createServerSupabaseClient()) as any;
  const out: Record<string, unknown[]> = {};
  for (const v of VERTICALS) {
    const { data, error } = await supabase
      .from(`p_order_${v}`)
      .select("*")
      .eq("p_order_id", Number(id));
    if (error) return bad(error.message, "db", 500);
    out[v] = data ?? [];
  }
  return NextResponse.json({ ok: true, data: out });
}
