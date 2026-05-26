import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getTbcPaymentDetails } from "@/app/lib/tbc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only polling endpoint. Given a `?bookingId=` returns the live
 * deposit status both from our DB row and (when a payId is stored)
 * fresh from TBC. Used by BookingDetail to verify after the operator
 * sends the link, without needing to wait for the webhook.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const bookingId = new URL(req.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json(
      { ok: false, error: "missing_bookingId" },
      { status: 400 },
    );
  }

  const { data: booking } = await gogaAdmin()
    .from("bookings")
    .select("id, deposit_status, stripe_session_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }

  let providerStatus: string | null = null;
  if (booking.stripe_session_id) {
    try {
      const d = await getTbcPaymentDetails(booking.stripe_session_id);
      providerStatus = d.status ?? null;
    } catch (e) {
      console.error("[payments/status] tbc fetch failed:", e);
    }
  }

  return NextResponse.json({
    ok: true,
    depositStatus: booking.deposit_status,
    payId: booking.stripe_session_id,
    providerStatus,
  });
}
