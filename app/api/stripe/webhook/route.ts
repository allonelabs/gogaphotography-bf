import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/app/lib/stripe";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!sig || !whSecret) {
    return NextResponse.json(
      { ok: false, error: "no_signature" },
      { status: 400 },
    );
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (e) {
    console.error("[stripe/webhook] verify failed:", e);
    return NextResponse.json(
      { ok: false, error: "bad_signature" },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const bookingId = session.metadata?.["bookingId"];
        if (!bookingId) break;

        const sb = gogaAdmin();

        // Idempotency guard. Stripe retries failed deliveries with the same
        // event id, and `checkout.session.completed` fires once per session
        // but the webhook may be invoked multiple times. If the booking is
        // already in 'paid' state, skip the lead_event insert so we don't
        // accrue duplicate audit rows on each retry. Booking + lead updates
        // are themselves idempotent (same values overwrite).
        const { data: prior } = await sb
          .from("bookings")
          .select("deposit_status")
          .eq("id", bookingId)
          .maybeSingle();
        const alreadyPaid = prior?.deposit_status === "paid";

        await sb
          .from("bookings")
          .update({
            deposit_status: "paid",
            stripe_intent_id:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : null,
            status: "confirmed",
          })
          .eq("id", bookingId);

        const leadId = session.metadata?.["leadId"];
        if (leadId && !alreadyPaid) {
          await sb.from("leads").update({ stage: "contract" }).eq("id", leadId);
          await sb.from("lead_events").insert({
            lead_id: leadId,
            kind: "deposit.paid",
            payload: { bookingId, sessionId: session.id },
            actor: "stripe",
          });
        }
        break;
      }
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired": {
        const session = event.data.object;
        const bookingId = session.metadata?.["bookingId"];
        if (!bookingId) break;
        await gogaAdmin()
          .from("bookings")
          .update({ deposit_status: "failed" })
          .eq("id", bookingId);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook] handler error:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
