import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

/**
 * Per-hotel balance — derived from the booking workflow.
 *
 * Returns:
 *   - `computed`: { total_sold, total_refunded, balance } from
 *     `hotel_balance_computed` (sums of p_order_hotel.sell_price minus
 *     p_refund_hotel.uncharge).
 *   - `entries`: legacy `hotel_balance` table rows (manual adjustments,
 *     opening balances) — kept for historical continuity.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const hotelId = Number(id);
  const supabase = (await createServerSupabaseClient()) as any;

  // Computed numbers from the view. .maybeSingle() — the view always has a
  // row per existing hotel, but be defensive about deleted hotels.
  const { data: computed, error: viewErr } = await supabase
    .from("hotel_balance_computed")
    .select("hotel_id, total_sold, total_refunded, balance")
    .eq("hotel_id", hotelId)
    .maybeSingle();
  if (viewErr) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: viewErr.message } },
      { status: 500 },
    );
  }

  // Historical entries — kept alongside for the UI.
  const { data: entries, error: entriesErr } = await supabase
    .from("hotel_balance")
    .select("id, amount, currency, recorded_at")
    .eq("hotel_id", hotelId)
    .order("recorded_at", { ascending: false });
  if (entriesErr) {
    return NextResponse.json(
      { ok: false, error: { code: "db", message: entriesErr.message } },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      computed: computed ?? {
        hotel_id: hotelId,
        total_sold: 0,
        total_refunded: 0,
        balance: 0,
      },
      entries: entries ?? [],
    },
  });
}
