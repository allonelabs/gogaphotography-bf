// app/lib/goga/store-checkout.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { createTbcPayment } from "@/app/lib/tbc";
import { getProductsByIds } from "./store-products";
import { recomputeCart, type CartLine } from "./store-pricing";

function siteOrigin(): string {
  const raw = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030";
  return raw.replace(/\/$/, "");
}

export interface CheckoutResult {
  redirectUrl: string;
  orderId: string;
}

/**
 * Validate cart against DB prices, create a pending order + items, open a
 * TBC payment session, persist the payId, and return the redirect URL.
 * merchantPaymentId is prefixed `store_` so the shared payments callback
 * can route it to the store finalizer.
 */
export async function startCheckout(
  cart: CartLine[],
  buyerEmail: string,
): Promise<CheckoutResult> {
  const email = buyerEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("Invalid email");

  const ids = Array.from(new Set(cart.map((l) => l.productId)));
  const products = await getProductsByIds(ids);
  const priced = recomputeCart(cart, products);

  const sb = gogaAdmin();
  const { data: order, error } = await sb
    .from("store_orders")
    .insert({
      buyer_email: email,
      status: "pending",
      total_cents: priced.totalCents,
      currency: priced.currency,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`create order: ${error?.message}`);

  await sb
    .from("store_order_items")
    .insert(priced.items.map((i) => ({ order_id: order.id, ...i })));

  const origin = siteOrigin();
  const secret = process.env["PAYMENT_CALLBACK_SECRET"] ?? "";
  const { payId, redirectUrl } = await createTbcPayment({
    externalOrderId: `store_${order.id}`,
    totalAmount: priced.totalCents / 100,
    currency: priced.currency,
    callbackUrl: `${origin}/api/payments/callback?secret=${encodeURIComponent(secret)}`,
    returnUrl: `${origin}/store/success?order=${order.id}`,
    locale: "ka",
    description: "GOGA Store",
  });

  await sb
    .from("store_orders")
    .update({ tbc_payment_id: payId })
    .eq("id", order.id);
  return { redirectUrl, orderId: order.id };
}
