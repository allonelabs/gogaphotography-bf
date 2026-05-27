import { NextResponse, type NextRequest } from "next/server";
import { finalizeTbcPayment } from "@/app/lib/goga/finalize-tbc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * TBC TPay webhook receiver.
 *
 * TBC posts JSON like `{ PaymentId: "..." }` to this endpoint when a
 * session terminates (success / failure / cancel). The webhook body is
 * NOT trusted on its own — finalizeTbcPayment() turns around and GETs
 * the canonical payment status from TBC with our API key, then mirrors
 * to `bookings`/`leads`/`lead_events`.
 *
 * Optional soft check: PAYMENT_CALLBACK_SECRET as a `?secret=` query
 * param. This is belt-and-braces; the real verification is that only
 * TBC can return "Succeeded" from its API to our authenticated read.
 */
function safeEqual(a: string | null, b: string | null): boolean {
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function POST(req: NextRequest) {
  const expected = process.env["PAYMENT_CALLBACK_SECRET"];
  // Fail-CLOSED. If the secret env isn't set, refuse every webhook —
  // a misconfigured production must not silently accept unauthenticated
  // callbacks. The only legitimate case where it could be unset is a
  // brand-new deploy that hasn't been provisioned yet.
  if (!expected) {
    console.error(
      "[payments/callback] PAYMENT_CALLBACK_SECRET unset; rejecting",
    );
    return NextResponse.json(
      { error: "callback_unconfigured" },
      { status: 503 },
    );
  }
  const provided = new URL(req.url).searchParams.get("secret");
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const payId =
    (body as { PaymentId?: string; paymentId?: string })?.PaymentId ??
    (body as { paymentId?: string })?.paymentId ??
    null;

  if (payId) {
    try {
      await finalizeTbcPayment(payId);
    } catch (e) {
      console.error("[payments/callback] finalize threw:", e);
      // Still 200 — we'll re-fetch on the user's return as a safety net.
    }
  }

  return NextResponse.json({ ok: true });
}
