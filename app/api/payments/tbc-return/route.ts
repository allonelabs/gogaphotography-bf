import { NextResponse, type NextRequest } from "next/server";
import { finalizeTbcPayment } from "@/app/lib/goga/finalize-tbc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Browser-return handler. TBC sends the client back here after they
 * approve / cancel — we finalize again as a safety net (the async
 * webhook may not have arrived yet) and then redirect to /book/thanks
 * (success) or back to the booking page with ?cancelled=1 on failure.
 *
 * The booking id comes back inside the TBC payment details
 * (merchantPaymentId), so we don't need to trust query params.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const payId = url.searchParams.get("payId") ?? "";
  const origin = url.origin;

  if (!payId) {
    return NextResponse.redirect(`${origin}/app/bookings`);
  }

  let outcome: string = "pending";
  try {
    outcome = await finalizeTbcPayment(payId);
  } catch (e) {
    console.error("[payments/tbc-return] finalize threw:", e);
  }

  if (outcome === "paid") {
    return NextResponse.redirect(`${origin}/book/thanks?payId=${payId}`);
  }
  // Fallback: just send them to /book/thanks regardless — it's a
  // friendly "thanks for paying / payment is processing" page either
  // way, and the operator sees the canonical state in the admin.
  return NextResponse.redirect(
    `${origin}/book/thanks?payId=${payId}&state=${outcome}`,
  );
}
