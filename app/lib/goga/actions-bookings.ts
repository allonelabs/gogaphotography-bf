"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";
import { computeBookingTotal } from "./pricing";

export async function createBookingFromLead(input: {
  leadId: string;
  packageId: string;
  shootDate: string;
  shootTime?: string | null;
  location?: string | null;
  addonIds?: string[];
  extraHours?: number;
}): Promise<{ id: string }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: pkg, error: pkgErr } = await sb
    .from("packages")
    .select(
      "base_price_cents, currency, duration_hours, deposit_pct, extra_hour_cents, max_extra_hours",
    )
    .eq("id", input.packageId)
    .single();
  if (pkgErr || !pkg) throw new Error("package not found");

  const addonIds = input.addonIds ?? [];
  const { data: addons } = addonIds.length
    ? await sb
        .from("addons")
        .select("id, name_en, name_ka, name_ru, price_cents")
        .in("id", addonIds)
    : { data: [] };
  const resolvedAddons = addons ?? [];

  // Clamp to what the package actually allows — a stale client (or a
  // tampered request) can't push extra hours past max_extra_hours.
  const extraHours = Math.max(
    0,
    Math.min(input.extraHours ?? 0, pkg.max_extra_hours),
  );

  const { subtotalCents, totalCents, depositCents } = computeBookingTotal({
    basePriceCents: pkg.base_price_cents,
    extraHours,
    extraHourCents: pkg.extra_hour_cents,
    addonCents: resolvedAddons.map((a) => a.price_cents),
    depositPct: pkg.deposit_pct,
  });

  const { data: lead } = await sb
    .from("leads")
    .select("name, email, phone")
    .eq("id", input.leadId)
    .maybeSingle();
  if (!lead) throw new Error("lead_not_found");

  const { data, error } = await sb
    .from("bookings")
    .insert({
      lead_id: input.leadId,
      package_id: input.packageId,
      shoot_date: input.shootDate,
      shoot_time: input.shootTime ?? null,
      duration_hours: pkg.duration_hours,
      location: input.location ?? null,
      extra_hours: extraHours,
      addons: resolvedAddons,
      subtotal_cents: subtotalCents,
      deposit_cents: depositCents,
      total_cents: totalCents,
      currency: pkg.currency,
      status: "reserved",
      client_name: lead?.name ?? null,
      client_email: lead?.email ?? null,
      client_phone: lead?.phone ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await sb
    .from("leads")
    .update({
      stage: "consultation",
      package_id: input.packageId,
      shoot_date: input.shootDate,
    })
    .eq("id", input.leadId);

  await sb.from("lead_events").insert({
    lead_id: input.leadId,
    kind: "booking.created",
    payload: { bookingId: data.id, packageId: input.packageId },
  });
  await logAdminEvent("booking.created", {
    entityType: "booking",
    entityId: data.id,
    payload: {
      leadId: input.leadId,
      packageId: input.packageId,
      shootDate: input.shootDate,
      extraHours,
      addonIds,
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${input.leadId}`);
  return { id: data.id };
}

export async function setBookingStatus(
  id: string,
  status:
    | "inquiry"
    | "reserved"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show",
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: prior } = await sb
    .from("bookings")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await sb.from("bookings").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  await logAdminEvent("booking.status_changed", {
    entityType: "booking",
    entityId: id,
    payload: { from: prior?.status ?? null, to: status },
  });
  revalidatePath("/admin/bookings");
  revalidatePath(`/admin/bookings/${id}`);
}

export async function deleteBooking(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("bookings").delete().eq("id", id);
  await logAdminEvent("booking.deleted", {
    entityType: "booking",
    entityId: id,
  });
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings");
}

export async function updateBookingNotes(
  id: string,
  notes: string,
): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("bookings")
    .update({ notes: notes.trim() || null })
    .eq("id", id);
  await logAdminEvent("booking.note_edited", {
    entityType: "booking",
    entityId: id,
  });
  revalidatePath(`/admin/bookings/${id}`);
}
