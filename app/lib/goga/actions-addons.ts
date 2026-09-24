"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";

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
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function readFields(fd: FormData) {
  return {
    name_en: String(fd.get("name_en") ?? "").trim(),
    name_ka: String(fd.get("name_ka") ?? "").trim() || null,
    name_ru: String(fd.get("name_ru") ?? "").trim() || null,
    description_en: String(fd.get("description_en") ?? "").trim() || null,
    description_ka: String(fd.get("description_ka") ?? "").trim() || null,
    description_ru: String(fd.get("description_ru") ?? "").trim() || null,
    price_cents: parseCents(fd.get("price")),
    sort_order: parseInt(String(fd.get("sort_order") ?? "0"), 10) || 0,
    published: fd.get("published") === "on",
  };
}

export async function createAddon(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readFields(formData);
  if (!fields.name_en) throw new Error("name_en is required");

  const baseSlug = slugify(
    String(formData.get("slug") ?? "") || fields.name_en,
  );
  let slug = baseSlug || `addon-${Date.now()}`;
  let n = 1;
  for (;;) {
    const { data } = await sb
      .from("addons")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const { data, error } = await sb
    .from("addons")
    .insert({ slug, ...fields })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/addons");
  redirect(`/admin/addons/${data.id}`);
}

export async function updateAddon(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readFields(formData);
  if (!fields.name_en) throw new Error("name_en is required");

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const update = rawSlug ? { slug: slugify(rawSlug), ...fields } : fields;

  const { error } = await sb.from("addons").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/addons");
  revalidatePath(`/admin/addons/${id}`);
}

export async function deleteAddon(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("addons").delete().eq("id", id);
  revalidatePath("/admin/addons");
}

export async function toggleAddonPublished(id: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("addons")
    .select("published")
    .eq("id", id)
    .single();
  if (!data) throw new Error("not_found");
  await sb.from("addons").update({ published: !data.published }).eq("id", id);
  revalidatePath("/admin/addons");
  revalidatePath(`/admin/addons/${id}`);
}
