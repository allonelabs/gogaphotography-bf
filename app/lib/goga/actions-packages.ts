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
    short_desc_en: String(fd.get("short_desc_en") ?? "").trim() || null,
    short_desc_ka: String(fd.get("short_desc_ka") ?? "").trim() || null,
    deliverables_en: String(fd.get("deliverables_en") ?? "").trim() || null,
    deliverables_ka: String(fd.get("deliverables_ka") ?? "").trim() || null,
    base_price_cents: parseCents(fd.get("base_price")),
    currency: (
      String(fd.get("currency") ?? "EUR").trim() || "EUR"
    ).toUpperCase(),
    duration_hours: parseFloat(String(fd.get("duration_hours") ?? "0")) || null,
    deposit_pct: Math.max(
      0,
      Math.min(100, parseInt(String(fd.get("deposit_pct") ?? "30"), 10) || 30),
    ),
    published: fd.get("published") === "on",
  };
}

export async function createPackage(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readFields(formData);
  if (!fields.name_en) throw new Error("name_en is required");

  const baseSlug = slugify(
    String(formData.get("slug") ?? "") || fields.name_en,
  );
  let slug = baseSlug || `package-${Date.now()}`;
  let n = 1;
  for (;;) {
    const { data } = await sb
      .from("packages")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) break;
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const { data, error } = await sb
    .from("packages")
    .insert({ slug, ...fields })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/app/packages");
  redirect(`/app/packages/${data.id}`);
}

export async function updatePackage(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readFields(formData);
  if (!fields.name_en) throw new Error("name_en is required");

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const update = rawSlug ? { slug: slugify(rawSlug), ...fields } : fields;

  const { error } = await sb.from("packages").update(update).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/app/packages");
  revalidatePath(`/app/packages/${id}`);
}

export async function deletePackage(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("packages").delete().eq("id", id);
  revalidatePath("/app/packages");
  redirect("/app/packages");
}
