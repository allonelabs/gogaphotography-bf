"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { stripe } from "@/app/lib/stripe";
import { requireSession } from "./require-auth";

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

export async function createDepositCheckout(
  bookingId: string,
): Promise<{ url: string }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: booking, error } = await sb
    .from("bookings")
    .select(
      `id, lead_id, deposit_cents, currency, client_email, client_name,
       deposit_status, package_id, packages(name_en, slug)`,
    )
    .eq("id", bookingId)
    .single();
  if (error || !booking) throw new Error("booking not found");
  if (booking.deposit_cents <= 0) throw new Error("deposit_cents is zero");
  if (booking.deposit_status === "paid") {
    throw new Error("deposit already paid");
  }

  const origin = await siteOrigin();
  const pkgName = booking.packages?.name_en ?? "Photography deposit";

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: booking.currency.toLowerCase(),
          product_data: { name: `Deposit · ${pkgName}` },
          unit_amount: booking.deposit_cents,
        },
      },
    ],
    customer_email: booking.client_email ?? undefined,
    metadata: {
      bookingId: booking.id,
      leadId: booking.lead_id ?? "",
    },
    payment_intent_data: {
      metadata: {
        bookingId: booking.id,
        leadId: booking.lead_id ?? "",
      },
    },
    success_url: `${origin}/book/thanks?session={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app/bookings/${booking.id}?cancelled=1`,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");

  await sb
    .from("bookings")
    .update({
      stripe_session_id: session.id,
      deposit_status: "pending",
    })
    .eq("id", booking.id);

  revalidatePath(`/app/bookings/${booking.id}`);
  return { url: session.url };
}
