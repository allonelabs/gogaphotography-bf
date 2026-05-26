import "server-only";

import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getTbcPaymentDetails } from "@/app/lib/tbc";
import { logAdminEvent } from "./admin-events";

export type TbcOutcome = "paid" | "failed" | "refunded" | "pending" | "unknown";

/**
 * Bank-as-source-of-truth finalizer. Given a payId from a TBC callback or
 * browser return, fetch the canonical payment status from TBC and flip
 * the booking row accordingly. Idempotent: each branch updates only when
 * the booking isn't already in the target state.
 */
export async function finalizeTbcPayment(payId: string): Promise<TbcOutcome> {
  const sb = gogaAdmin();
  const details = await getTbcPaymentDetails(payId);
  const status = details.status;
  const bookingId = details.merchantPaymentId;

  console.log("[tbc/finalize]", { payId, status, bookingId });

  if (!bookingId) {
    console.error("[tbc/finalize] missing merchantPaymentId for", payId);
    return "unknown";
  }

  if (status === "Succeeded") {
    const { data: booking } = await sb
      .from("bookings")
      .update({
        deposit_status: "paid",
        status: "confirmed",
        stripe_intent_id: payId,
      })
      .eq("id", bookingId)
      .neq("deposit_status", "paid")
      .select("id, lead_id")
      .maybeSingle();
    if (booking?.lead_id) {
      await sb
        .from("leads")
        .update({ stage: "contract" })
        .eq("id", booking.lead_id);
      await sb.from("lead_events").insert({
        lead_id: booking.lead_id,
        kind: "deposit.paid",
        payload: { bookingId, payId },
        actor: "tbc",
      });
    }
    if (booking) {
      await logAdminEvent("deposit.paid", {
        entityType: "booking",
        entityId: bookingId,
        payload: { payId },
        actor: "tbc",
      });
    }
    return "paid";
  }

  if (status === "Failed" || status === "Expired") {
    const { data: failed } = await sb
      .from("bookings")
      .update({ deposit_status: "failed" })
      .eq("id", bookingId)
      .neq("deposit_status", "failed")
      .select("id")
      .maybeSingle();
    if (failed) {
      await logAdminEvent("deposit.failed", {
        entityType: "booking",
        entityId: bookingId,
        payload: { payId, status },
        actor: "tbc",
      });
    }
    return "failed";
  }

  if (status === "Refunded" || status === "PartiallyRefunded") {
    await sb
      .from("bookings")
      .update({ deposit_status: "refunded" })
      .eq("id", bookingId)
      .neq("deposit_status", "refunded");
    return "refunded";
  }

  return "pending";
}
