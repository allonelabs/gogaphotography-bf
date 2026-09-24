"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";
import { runRule } from "./automation";
import { renderTemplate } from "./template-render";
import { formatMoney } from "./money";
import { resolveBookingAddons, describeAddons } from "./booking-addons";
import { publicSignUrl } from "./site-urls";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Ensure a contract exists for this booking and return it. Idempotent —
 * if a non-void contract already exists we return that one instead of
 * making a duplicate.
 *
 * Body is rendered from the admin-editable `contract_templates` row (id=1)
 * in all three languages, filled with the booking's own numbers.
 */
export async function ensureContractForBooking(
  bookingId: string,
): Promise<{ id: string; token: string; created: boolean }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: existing } = await sb
    .from("contracts")
    .select("id, token")
    .eq("booking_id", bookingId)
    .neq("status", "void")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { ...existing, created: false };

  const { data: booking } = await sb
    .from("bookings")
    .select(
      `id, shoot_date, shoot_time, location, addons, extra_hours, duration_hours,
       subtotal_cents, total_cents, deposit_cents, currency,
       client_name, client_email, client_phone, lead_id,
       packages(name_en, name_ka, name_ru)`,
    )
    .eq("id", bookingId)
    .single();
  if (!booking) throw new Error("booking_not_found");
  // Narrow once into a const — the inline `booking` binding above doesn't
  // stay narrowed inside the `bodyFor` closure defined further down.
  const bk = booking;

  let leadLocale: string | null = null;
  if (booking.lead_id) {
    const { data: lead } = await sb
      .from("leads")
      .select("locale")
      .eq("id", booking.lead_id)
      .maybeSingle();
    leadLocale = lead?.locale ?? null;
  }

  const { data: tpl } = await sb
    .from("contract_templates")
    .select("body_en, body_ka, body_ru")
    .eq("id", 1)
    .maybeSingle();

  const resolvedAddons = await resolveBookingAddons(booking.addons);
  // BUG FIX: the previous generator used subtotal_cents for "total" — for a
  // booking with extra hours or add-ons, subtotal and total have diverged
  // (subtotal excludes them, total_cents is what the client actually owes).
  // See docs/superpowers/specs/2026-09-24-contract-completion-design.md.
  const totalStr = formatMoney(booking.total_cents, booking.currency);
  const depositStr = formatMoney(booking.deposit_cents, booking.currency);
  const balanceStr = formatMoney(
    Math.max(0, booking.total_cents - booking.deposit_cents),
    booking.currency,
  );
  const today = new Date().toISOString().slice(0, 10);

  function bodyFor(
    locale: "en" | "ka" | "ru",
    raw: string | undefined,
  ): string {
    const pkgName =
      (locale === "ka"
        ? bk.packages?.name_ka
        : locale === "ru"
          ? bk.packages?.name_ru
          : bk.packages?.name_en) ??
      bk.packages?.name_en ??
      "Photography session";
    return renderTemplate(raw ?? "", {
      client_name: bk.client_name ?? "",
      client_email: bk.client_email ?? "",
      client_phone: bk.client_phone ?? "",
      shoot_date: bk.shoot_date,
      shoot_time: bk.shoot_time ?? "",
      location: bk.location ?? "",
      package: pkgName,
      duration_hours: bk.duration_hours ?? "",
      addons: describeAddons(resolvedAddons, bk.currency, locale),
      extra_hours: bk.extra_hours ?? 0,
      total: totalStr,
      deposit: depositStr,
      balance: balanceStr,
      currency: bk.currency,
      today,
    });
  }

  const body_en = bodyFor("en", tpl?.body_en);
  const body_ka = bodyFor("ka", tpl?.body_ka);
  const body_ru = bodyFor("ru", tpl?.body_ru);

  const token = randomToken();
  const { data, error } = await sb
    .from("contracts")
    .insert({
      booking_id: bookingId,
      token,
      body_en,
      body_ka,
      body_ru,
      signer_name: booking.client_name,
      signer_email: booking.client_email,
      status: "draft",
    })
    .select("id, token")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert_failed");
  await logAdminEvent("contract.created", {
    entityType: "contract",
    entityId: data.id,
    payload: { bookingId, leadLocale },
  });

  revalidatePath(`/admin/bookings/${bookingId}`);
  revalidatePath("/admin/contracts");
  return { id: data.id, token: data.token, created: true };
}

export async function updateContractBody(
  id: string,
  patch: {
    body_en?: string | null;
    body_ka?: string | null;
    body_ru?: string | null;
  },
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: c } = await sb
    .from("contracts")
    .select("status")
    .eq("id", id)
    .single();
  if (!c || c.status === "signed") {
    throw new Error("cannot_edit_signed");
  }
  await sb.from("contracts").update(patch).eq("id", id);
  revalidatePath(`/admin/contracts/${id}`);
}

export async function sendContract(id: string): Promise<{ ok: boolean }> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: c } = await sb
    .from("contracts")
    .select(
      `id, token, status, signer_email, signer_name, body_en,
       bookings(shoot_date, packages(name_en), lead_id, leads(locale))`,
    )
    .eq("id", id)
    .single();
  if (!c) throw new Error("not_found");
  if (c.status === "signed") throw new Error("already_signed");
  if (!c.signer_email) throw new Error("no_signer_email");
  if (!c.body_en?.trim()) throw new Error("empty_body");

  // The public static site now hosts signing (?t= query, not the admin's
  // own /sign/<token> path — that route stays live for back-compat).
  const url = publicSignUrl(c.token);
  const locale = c.bookings?.leads?.locale ?? "en";

  const result = await runRule(
    "contract_sent",
    id,
    {
      client_name: c.signer_name ?? "",
      sign_url: url,
    },
    { to: c.signer_email, locale },
  );
  if (!result.ok) {
    throw new Error(`email_not_sent: ${result.error ?? "unknown error"}`);
  }

  await sb
    .from("contracts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", id);
  await logAdminEvent("contract.sent", {
    entityType: "contract",
    entityId: id,
    payload: { to: c.signer_email, skipped: result.skipped ?? null },
  });

  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
  return { ok: true };
}

export async function voidContract(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("contracts").update({ status: "void" }).eq("id", id);
  await logAdminEvent("contract.voided", {
    entityType: "contract",
    entityId: id,
  });
  revalidatePath(`/admin/contracts/${id}`);
  revalidatePath("/admin/contracts");
}
