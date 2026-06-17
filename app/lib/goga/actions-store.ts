// app/lib/goga/actions-store.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { enqueueOutbound } from "@/app/lib/outbox/singleton";
import { requireSession } from "./require-auth";
import { buildDownloadEmail } from "./store-email";
import { enqueuePin } from "./pinterest-queue";
import type { StoreProductType } from "@/app/lib/db/store-types";

const STORE_ORG_ID = 1;

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
function parseCents(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "0").replace(",", "."));
  return !Number.isFinite(n) || n < 0 ? 0 : Math.round(n * 100);
}
function fromEmail(): string {
  return process.env["STORE_FROM_EMAIL"] ?? "GOGA <store@gogaphotography.ge>";
}
function originForEmail(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030"
  ).replace(/\/$/, "");
}

async function uniqueSlug(base: string): Promise<string> {
  const sb = gogaAdmin();
  const root = slugify(base) || `product-${Date.now()}`;
  let slug = root;
  let n = 1;
  for (;;) {
    const { data } = await sb
      .from("store_products")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

// Uploads a deliverable file to the private bucket; returns {path,size}.
async function uploadFile(file: File): Promise<{ path: string; size: number }> {
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("store-files").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`file upload: ${error.message}`);
  return { path, size: buf.byteLength };
}

// Uploads a cover/preview image to the public `projects` bucket; returns the path.
async function uploadImage(file: File): Promise<string> {
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `store/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("projects").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`image upload: ${error.message}`);
  return path;
}

export async function createStoreProduct(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("title is required");
  const type = String(formData.get("type") ?? "preset") as StoreProductType;

  const slug = await uniqueSlug(String(formData.get("slug") ?? "") || title);

  const cover = formData.get("cover") as File | null;
  const cover_image_path =
    cover && cover.size > 0 ? await uploadImage(cover) : null;

  const file = formData.get("file") as File | null;
  const uploaded = file && file.size > 0 ? await uploadFile(file) : null;

  const { data: created, error } = await sb
    .from("store_products")
    .insert({
      type,
      title,
      slug,
      description: String(formData.get("description") ?? "").trim() || null,
      price_cents: parseCents(formData.get("price")),
      currency: (
        String(formData.get("currency") ?? "GEL").trim() || "GEL"
      ).toUpperCase(),
      cover_image_path,
      file_path: uploaded?.path ?? null,
      file_size_bytes: uploaded?.size ?? null,
      license_terms: String(formData.get("license_terms") ?? "").trim() || null,
      published: formData.get("published") === "on",
    })
    .select("id")
    .single();
  if (error) throw new Error(`createStoreProduct: ${error.message}`);
  if (formData.get("published") === "on" && created) {
    try {
      await enqueuePin("product", created.id);
    } catch (e) {
      console.error("enqueuePin product", e);
    }
  }
  revalidatePath("/app/store");
  revalidatePath("/store");
  redirect("/app/store");
}

export async function updateStoreProduct(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const patch: Record<string, unknown> = {
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "preset"),
    description: String(formData.get("description") ?? "").trim() || null,
    price_cents: parseCents(formData.get("price")),
    currency: (
      String(formData.get("currency") ?? "GEL").trim() || "GEL"
    ).toUpperCase(),
    license_terms: String(formData.get("license_terms") ?? "").trim() || null,
    published: formData.get("published") === "on",
    updated_at: new Date().toISOString(),
  };
  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0)
    patch.cover_image_path = await uploadImage(cover);
  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    const up = await uploadFile(file);
    patch.file_path = up.path;
    patch.file_size_bytes = up.size;
  }
  const { error } = await sb
    .from("store_products")
    .update(patch as import("@/app/lib/db/store-types").StoreProductRow)
    .eq("id", id);
  if (error) throw new Error(`updateStoreProduct: ${error.message}`);
  if (formData.get("published") === "on") {
    try {
      await enqueuePin("product", id);
    } catch (e) {
      console.error("enqueuePin product", e);
    }
  }
  revalidatePath("/app/store");
  revalidatePath("/store");
  redirect("/app/store");
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await requireSession();
  const { error } = await gogaAdmin()
    .from("store_products")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteStoreProduct: ${error.message}`);
  revalidatePath("/app/store");
  revalidatePath("/store");
}

export async function resendDownloadEmail(orderId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: order } = await sb
    .from("store_orders")
    .select("buyer_email, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid") throw new Error("Order is not paid");
  const { data: dls } = await sb
    .from("store_downloads")
    .select("token, product_id")
    .eq("order_id", orderId);
  const { data: items } = await sb
    .from("store_order_items")
    .select("product_id, title_snapshot")
    .eq("order_id", orderId);
  const titleBy = new Map(
    (items ?? []).map((i) => [i.product_id, i.title_snapshot]),
  );
  const email = buildDownloadEmail({
    origin: originForEmail(),
    items: (dls ?? []).map((d) => ({
      title: titleBy.get(d.product_id) ?? "Download",
      token: d.token,
    })),
  });
  await enqueueOutbound({
    organization_id: STORE_ORG_ID,
    kind: "email.send",
    payload: {
      to: order.buyer_email,
      from: fromEmail(),
      subject: email.subject,
      html: email.html,
    },
  });
  revalidatePath("/app/store/orders");
}

export async function markRefunded(orderId: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("store_orders")
    .update({ status: "refunded" })
    .eq("id", orderId);
  revalidatePath("/app/store/orders");
}
