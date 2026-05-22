/**
 * Stripe webhook receiver — verifies signature, reconciles payment_intent.
 *
 * Per BF ADR-037: every webhook receiver MUST verify the signature before
 * any side-effect. Malformed sig → 401 with vendor-error code preserved.
 *
 * Reconciliation: maps the Stripe event types we care about to status
 * transitions on `payment_intent`. Events we don't recognize are 200'd
 * (Stripe retries forever otherwise).
 */
import "server-only";

import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { getStripeClient, isStripeEnabled } from "./stripe";

const STRIPE_WEBHOOK_SECRET_ENV = "STRIPE_WEBHOOK_SECRET";

export async function handleStripeWebhook(req: Request): Promise<Response> {
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { ok: false, error: "stripe_not_configured" },
      { status: 503 },
    );
  }

  const secret = process.env[STRIPE_WEBHOOK_SECRET_ENV];
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "missing_webhook_secret" },
      { status: 500 },
    );
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { ok: false, error: "missing_signature" },
      { status: 401 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_signature",
        details: (e as Error).message,
      },
      { status: 401 },
    );
  }

  const sb = await createServerSupabaseClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await (sb as any)
        .from("payment_intent")
        .update({
          status: "succeeded",
          stripe_payment_intent_id:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : (session.payment_intent?.id ?? null),
        })
        .eq("stripe_session_id", session.id);
      break;
    }
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await (sb as any)
        .from("payment_intent")
        .update({ status: "failed" })
        .eq("stripe_session_id", session.id);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const pi =
        typeof charge.payment_intent === "string"
          ? charge.payment_intent
          : (charge.payment_intent?.id ?? null);
      if (pi) {
        await (sb as any)
          .from("payment_intent")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent_id", pi);
      }
      break;
    }
    default:
      // Unknown event — ack so Stripe stops retrying.
      break;
  }

  return NextResponse.json({ ok: true, type: event.type });
}
