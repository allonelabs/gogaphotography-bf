// app/lib/goga/finalize-store-tbc.ts
import "server-only";
import { randomUUID } from "crypto";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getTbcPaymentDetails } from "@/app/lib/tbc";
import { enqueueOutbound } from "@/app/lib/outbox/singleton";
import { buildDownloadEmail } from "./store-email";
import type { TbcOutcome } from "./finalize-tbc";

const STORE_ORG_ID = 1;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface NewDownloadRow {
  order_id: string;
  product_id: string;
  token: string;
  max_downloads: number;
  expires_at: string;
}

/** Pure: one download row per product, 7-day expiry, 5-download cap. */
export function buildDownloadRows(
  orderId: string,
  productIds: string[],
  paidAt: Date,
  mkToken: () => string = randomUUID,
): NewDownloadRow[] {
  const expires_at = new Date(paidAt.getTime() + SEVEN_DAYS_MS).toISOString();
  return productIds.map((pid) => ({
    order_id: orderId,
    product_id: pid,
    token: mkToken(),
    max_downloads: 5,
    expires_at,
  }));
}

function siteOrigin(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030"
  ).replace(/\/$/, "");
}

/**
 * Finalize a store order from a TBC payId. Idempotent: only acts when the
 * order is not already `paid`. On success, mints download rows and enqueues
 * the download email via the outbox.
 */
export async function finalizeTbcStorePayment(
  payId: string,
): Promise<TbcOutcome> {
  const sb = gogaAdmin();
  const details = await getTbcPaymentDetails(payId);
  const status = details.status;
  const merchantId = details.merchantPaymentId ?? "";
  const orderId = merchantId.startsWith("store_")
    ? merchantId.slice("store_".length)
    : "";
  if (!orderId) return "unknown";

  if (status === "Succeeded") {
    const paidAt = new Date();
    const { data: order } = await sb
      .from("store_orders")
      .update({
        status: "paid",
        paid_at: paidAt.toISOString(),
        tbc_payment_id: payId,
      })
      .eq("id", orderId)
      .neq("status", "paid")
      .select("id, buyer_email")
      .maybeSingle();
    if (!order) return "paid"; // already finalized — no-op

    const { data: items } = await sb
      .from("store_order_items")
      .select("product_id, title_snapshot")
      .eq("order_id", orderId);
    const productIds = (items ?? []).map((i) => i.product_id);

    const rows = buildDownloadRows(orderId, productIds, paidAt);
    if (rows.length > 0) await sb.from("store_downloads").insert(rows);

    const titleByProduct = new Map(
      (items ?? []).map((i) => [i.product_id, i.title_snapshot]),
    );
    const email = buildDownloadEmail({
      origin: siteOrigin(),
      items: rows.map((r) => ({
        title: titleByProduct.get(r.product_id) ?? "Download",
        token: r.token,
      })),
    });
    await enqueueOutbound({
      organization_id: STORE_ORG_ID,
      kind: "email.send",
      payload: {
        to: order.buyer_email,
        from:
          process.env["STORE_FROM_EMAIL"] ?? "GOGA <store@gogaphotography.ge>",
        subject: email.subject,
        html: email.html,
      },
      idempotencyKey: `store-download-${orderId}`,
    });
    return "paid";
  }

  if (status === "Failed" || status === "Expired") {
    await sb
      .from("store_orders")
      .update({ status: "failed" })
      .eq("id", orderId)
      .neq("status", "paid");
    return "failed";
  }
  return "pending";
}
