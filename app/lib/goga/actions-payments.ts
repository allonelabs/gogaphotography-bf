"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { createTbcPayment, cancelTbcPayment } from "@/app/lib/tbc";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";

async function siteOrigin(): Promise<string> {
  const envUrl =
    process.env["NEXT_PUBLIC_SITE_URL"] ??
    (process.env["VERCEL_URL"] ? `https://${process.env["VERCEL_URL"]}` : null);
  if (envUrl) return envUrl;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3030";
  const proto = host.startsWith("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

/**
 * Create a TBC TPay session for a booking's deposit. Stores the payId on
 * the booking row (we reuse the `stripe_session_id` column for now — it's
 * just a "provider session id" string) and returns the hosted approval
 * URL for the operator to send to the client.
 */
export async function createDepositCheckout(
  bookingId: string,
): Promise<{ url: string; payId: string }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: booking, error } = await sb
    .from("bookings")
    .select(
      `id, lead_id, deposit_cents, currency, client_email, client_name,
       deposit_status, package_id, packages(name_en)`,
    )
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error("booking_not_found");
  if (booking.deposit_cents <= 0) throw new Error("deposit_cents_is_zero");
  if (booking.deposit_status === "paid")
    throw new Error("deposit_already_paid");

  const origin = await siteOrigin();
  const pkgName = booking.packages?.name_en ?? "Photography deposit";
  const callbackSecret = process.env["PAYMENT_CALLBACK_SECRET"];
  const callbackUrl = `${origin}/api/payments/callback${
    callbackSecret ? `?secret=${encodeURIComponent(callbackSecret)}` : ""
  }`;
  // TBC TPay amounts are decimal (not cents)
  const totalAmount = Math.round(booking.deposit_cents) / 100;

  const { payId, redirectUrl } = await createTbcPayment({
    externalOrderId: booking.id,
    totalAmount,
    currency: booking.currency || "GEL",
    callbackUrl,
    returnUrl: `${origin}/api/payments/tbc-return?payId=`,
    locale: "ka",
    description: `Deposit · ${pkgName}`.slice(0, 30),
  });

  await sb
    .from("bookings")
    .update({
      stripe_session_id: payId,
      deposit_status: "pending",
    })
    .eq("id", booking.id);
  await logAdminEvent("deposit.link_created", {
    entityType: "booking",
    entityId: booking.id,
    payload: { payId, amount: totalAmount, currency: booking.currency },
  });

  revalidatePath(`/app/bookings/${booking.id}`);
  return { url: redirectUrl, payId };
}

/**
 * Cancel a pending deposit. Calls TBC then nulls the deposit_status.
 */
export async function cancelDepositCheckout(bookingId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: booking } = await sb
    .from("bookings")
    .select("id, stripe_session_id, deposit_status")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking?.stripe_session_id) throw new Error("no_pending_payment");
  if (booking.deposit_status === "paid")
    throw new Error("deposit_already_paid");
  try {
    await cancelTbcPayment(booking.stripe_session_id);
  } catch (e) {
    // TBC may reject cancellation if the user already approved — fall
    // through so we at least clear our local state.
    console.error("[tbc/cancel] non-fatal:", e);
  }
  await sb
    .from("bookings")
    .update({ deposit_status: "none", stripe_session_id: null })
    .eq("id", bookingId);
  await logAdminEvent("deposit.cancelled", {
    entityType: "booking",
    entityId: bookingId,
    payload: { payId: booking.stripe_session_id },
  });
  revalidatePath(`/app/bookings/${bookingId}`);
}
