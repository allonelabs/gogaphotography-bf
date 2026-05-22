/**
 * Stripe integration — checkout sessions + signature verification.
 *
 * Key resolution order (first hit wins):
 *   1. STRIPE_SECRET_KEY env
 *   2. Keychain: `security find-generic-password -s "stripe-allonelabs" -w`
 *      (resolved at process startup in `loadStripeKey()` — cached in module
 *      state to keep hot-path calls synchronous after the first load).
 *   3. None — feature is gated behind STRIPE_ENABLED=1 and we throw a
 *      "stripe_not_configured" error.
 *
 * Both client construction and webhook verify go through `getStripeClient()`
 * so swapping in a mock test client (or rolling the key) only touches one
 * place.
 */
import "server-only";

import Stripe from "stripe";
import { execSync } from "node:child_process";
import { createServerSupabaseClient } from "@/app/lib/supabase/server";

let _client: Stripe | null = null;
let _resolved = false;

function resolveStripeKey(): string | null {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY;
  try {
    const out = execSync(
      `security find-generic-password -s "stripe-allonelabs" -w 2>/dev/null`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    if (out) return out;
  } catch {
    /* keychain miss is expected on Linux / CI / Vercel */
  }
  return null;
}

export function isStripeEnabled(): boolean {
  if (process.env.STRIPE_ENABLED === "0") return false;
  // Auto-enable when a key is available; explicit STRIPE_ENABLED=1 forces on.
  if (process.env.STRIPE_ENABLED === "1") return true;
  return resolveStripeKey() !== null;
}

export function getStripeClient(): Stripe {
  if (_client) return _client;
  if (!_resolved) {
    const key = resolveStripeKey();
    _resolved = true;
    if (!key) {
      throw new Error(
        "stripe_not_configured: set STRIPE_SECRET_KEY or add `stripe-allonelabs` to Keychain",
      );
    }
    _client = new Stripe(key, {
      apiVersion: "2025-09-30.clover" as Stripe.LatestApiVersion,
    });
  }
  if (!_client) {
    throw new Error("stripe_not_configured");
  }
  return _client;
}

export interface CreateCheckoutInput {
  amount_cents: number;
  currency: string;
  description: string;
  success_url: string;
  cancel_url: string;
  organization_id: number;
  p_order_id?: number | null;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResult {
  url: string;
  sessionId: string;
  paymentIntentRowId: number;
}

/**
 * Creates a Stripe Checkout Session and persists a matching `payment_intent`
 * row. The caller redirects the user to `url`. The session's `payment_intent`
 * is filled in once the user completes payment; the webhook receiver
 * (`webhook.ts`) reconciles.
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: input.currency,
          unit_amount: input.amount_cents,
          product_data: { name: input.description },
        },
        quantity: 1,
      },
    ],
    success_url: input.success_url,
    cancel_url: input.cancel_url,
    metadata: {
      organization_id: String(input.organization_id),
      ...(input.p_order_id ? { p_order_id: String(input.p_order_id) } : {}),
      ...(input.metadata ?? {}),
    },
  });

  const sb = await createServerSupabaseClient();
  const { data, error } = await (sb as any)
    .from("payment_intent")
    .insert({
      organization_id: input.organization_id,
      p_order_id: input.p_order_id ?? null,
      stripe_session_id: session.id,
      amount_cents: input.amount_cents,
      currency: input.currency,
      status: "pending",
      description: input.description,
      metadata: input.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`payment_intent insert failed: ${error.message}`);
  }

  return {
    url: session.url ?? "",
    sessionId: session.id,
    paymentIntentRowId: data.id,
  };
}
