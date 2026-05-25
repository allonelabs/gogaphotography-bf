"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

/* ============================= Hero ============================= */

export async function updateHero(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const headline_en = String(formData.get("headline_en") ?? "").trim() || null;
  const headline_ka = String(formData.get("headline_ka") ?? "").trim() || null;
  const subtitle_en = String(formData.get("subtitle_en") ?? "").trim() || null;
  const subtitle_ka = String(formData.get("subtitle_ka") ?? "").trim() || null;
  const { error } = await sb
    .from("hero")
    .update({ headline_en, headline_ka, subtitle_en, subtitle_ka })
    .eq("id", 1);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/app/hero");
}

/* ============================= Pages ============================= */

const KNOWN_PAGE_SLUGS = ["about", "services", "faq"] as const;
type KnownSlug = (typeof KNOWN_PAGE_SLUGS)[number];

function isKnownPageSlug(s: string): s is KnownSlug {
  return (KNOWN_PAGE_SLUGS as readonly string[]).includes(s);
}

export async function upsertPage(
  slug: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  if (!isKnownPageSlug(slug)) throw new Error("unknown_page");
  const sb = gogaAdmin();
  const update = {
    slug,
    title_en: String(formData.get("title_en") ?? "").trim() || null,
    title_ka: String(formData.get("title_ka") ?? "").trim() || null,
    body_en: String(formData.get("body_en") ?? "").trim() || null,
    body_ka: String(formData.get("body_ka") ?? "").trim() || null,
  };
  const { error } = await sb
    .from("pages")
    .upsert(update, { onConflict: "slug" });
  if (error) throw new Error(error.message);
  revalidatePath("/about-me");
  revalidatePath("/services");
  revalidatePath("/faq");
  revalidatePath(`/app/pages/${slug}`);
}

/* ============================= Services ============================= */

export async function createService(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) throw new Error("title_en is required");

  const { data: existing } = await sb
    .from("services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("services")
    .insert({
      title_en,
      title_ka: String(formData.get("title_ka") ?? "").trim() || null,
      description_en:
        String(formData.get("description_en") ?? "").trim() || null,
      description_ka:
        String(formData.get("description_ka") ?? "").trim() || null,
      price: String(formData.get("price") ?? "").trim() || null,
      published: formData.get("published") === "on",
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/app/services");
  redirect(`/app/services/${data.id}`);
}

export async function updateService(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) throw new Error("title_en is required");

  const { error } = await sb
    .from("services")
    .update({
      title_en,
      title_ka: String(formData.get("title_ka") ?? "").trim() || null,
      description_en:
        String(formData.get("description_en") ?? "").trim() || null,
      description_ka:
        String(formData.get("description_ka") ?? "").trim() || null,
      price: String(formData.get("price") ?? "").trim() || null,
      published: formData.get("published") === "on",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/services");
  revalidatePath(`/app/services/${id}`);
  revalidatePath("/services");
}

export async function deleteService(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("services").delete().eq("id", id);
  revalidatePath("/app/services");
}

export async function toggleServicePublished(id: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("services")
    .select("published")
    .eq("id", id)
    .single();
  if (!data) throw new Error("not_found");
  await sb.from("services").update({ published: !data.published }).eq("id", id);
  revalidatePath("/app/services");
  revalidatePath(`/app/services/${id}`);
}
