"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { hashPassword } from "./delivery-password";

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensure (or get) the active delivery for a booking. Idempotent — returns
 * the existing non-archived delivery if one exists.
 */
export async function ensureDelivery(
  bookingId: string,
): Promise<{ id: string; token: string; created: boolean }> {
  await requireSession();
  const sb = gogaAdmin();

  const { data: existing } = await sb
    .from("deliveries")
    .select("id, token")
    .eq("booking_id", bookingId)
    .eq("archived", false)
    .maybeSingle();
  if (existing)
    return { id: existing.id, token: existing.token, created: false };

  const token = randomToken();
  const { data, error } = await sb
    .from("deliveries")
    .insert({ booking_id: bookingId, token })
    .select("id, token")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert_failed");
  revalidatePath(`/app/bookings/${bookingId}`);
  revalidatePath("/app/deliveries");
  return { id: data.id, token: data.token, created: true };
}

export async function setDeliveryPassword(
  deliveryId: string,
  password: string,
): Promise<void> {
  await requireSession();
  if (password.length < 4) throw new Error("password_too_short");
  const hash = await hashPassword(password);
  await gogaAdmin()
    .from("deliveries")
    .update({ password_hash: hash })
    .eq("id", deliveryId);
  revalidatePath(`/app/deliveries/${deliveryId}`);
}

export async function clearDeliveryPassword(deliveryId: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("deliveries")
    .update({ password_hash: null })
    .eq("id", deliveryId);
  revalidatePath(`/app/deliveries/${deliveryId}`);
}

export async function updateDeliveryMeta(
  deliveryId: string,
  patch: {
    intro_en?: string | null;
    intro_ka?: string | null;
    expires_at?: string | null;
    downloads_enabled?: boolean;
  },
): Promise<void> {
  await requireSession();
  await gogaAdmin().from("deliveries").update(patch).eq("id", deliveryId);
  revalidatePath(`/app/deliveries/${deliveryId}`);
}

export async function uploadDeliveryImage(
  formData: FormData,
): Promise<{ id: string; imagePath: string }> {
  await requireSession();
  const sb = gogaAdmin();

  const deliveryId = String(formData.get("deliveryId") ?? "");
  const file = formData.get("file");
  if (!deliveryId) throw new Error("deliveryId required");
  if (!(file instanceof File)) throw new Error("file required");
  if (file.size === 0) throw new Error("file is empty");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("file too large (50 MB max)");

  const imagePath = `${deliveryId}/${Date.now()}-${safeFilename(file.name)}`;
  const { error: upErr } = await sb.storage
    .from("deliveries")
    .upload(imagePath, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) throw new Error(`storage: ${upErr.message}`);

  const { data: existing } = await sb
    .from("delivery_images")
    .select("sort_order")
    .eq("delivery_id", deliveryId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("delivery_images")
    .insert({
      delivery_id: deliveryId,
      image_path: imagePath,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error) {
    await sb.storage
      .from("deliveries")
      .remove([imagePath])
      .catch(() => {});
    throw new Error(error.message);
  }

  revalidatePath(`/app/deliveries/${deliveryId}`);
  return { id: data.id, imagePath };
}

export async function deleteDeliveryImage(imageId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("delivery_images")
    .select("delivery_id, image_path")
    .eq("id", imageId)
    .single();
  if (!data) return;
  await sb.from("delivery_images").delete().eq("id", imageId);
  if (data.image_path) {
    await sb.storage.from("deliveries").remove([data.image_path]);
  }
  revalidatePath(`/app/deliveries/${data.delivery_id}`);
}

export async function archiveDelivery(deliveryId: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("deliveries")
    .update({ archived: true })
    .eq("id", deliveryId);
  revalidatePath("/app/deliveries");
}
