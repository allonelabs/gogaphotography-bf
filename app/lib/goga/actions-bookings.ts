"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";

export async function createBookingFromLead(input: {
  leadId: string;
  packageId: string;
  shootDate: string;
  shootTime?: string | null;
  location?: string | null;
}): Promise<{ id: string }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: pkg, error: pkgErr } = await sb
    .from("packages")
    .select("base_price_cents, currency, duration_hours, deposit_pct")
    .eq("id", input.packageId)
    .single();
  if (pkgErr || !pkg) throw new Error("package not found");

  const subtotal = pkg.base_price_cents;
  const deposit = Math.round((subtotal * pkg.deposit_pct) / 100);

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
      subtotal_cents: subtotal,
      deposit_cents: deposit,
      total_cents: subtotal,
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
    },
  });

  revalidatePath("/app/bookings");
  revalidatePath("/app/leads");
  revalidatePath(`/app/leads/${input.leadId}`);
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
  revalidatePath("/app/bookings");
  revalidatePath(`/app/bookings/${id}`);
}

export async function deleteBooking(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("bookings").delete().eq("id", id);
  await logAdminEvent("booking.deleted", {
    entityType: "booking",
    entityId: id,
  });
  revalidatePath("/app/bookings");
  redirect("/app/bookings");
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
  revalidatePath(`/app/bookings/${id}`);
}
