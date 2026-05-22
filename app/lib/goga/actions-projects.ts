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

async function ensureUniqueSlug(
  base: string,
  ignoreId?: string,
): Promise<string> {
  const sb = gogaAdmin();
  let slug = base || `project-${Date.now()}`;
  for (let i = 0; i < 30; i++) {
    let q = sb.from("projects").select("id").eq("slug", slug);
    if (ignoreId) q = q.neq("id", ignoreId);
    const { data, error } = await q.limit(1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return slug;
    slug = `${base}-${i + 2}`;
  }
  throw new Error("could_not_pick_unique_slug");
}

export async function createProject(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) throw new Error("title_en is required");

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = await ensureUniqueSlug(slugify(rawSlug || title_en));
  const update = {
    slug,
    title_en,
    title_ka: String(formData.get("title_ka") ?? "").trim() || null,
    location_en: String(formData.get("location_en") ?? "").trim() || null,
    location_ka: String(formData.get("location_ka") ?? "").trim() || null,
    description_en: String(formData.get("description_en") ?? "").trim() || null,
    description_ka: String(formData.get("description_ka") ?? "").trim() || null,
    published: formData.get("published") === "on",
  };
  const { data, error } = await sb
    .from("projects")
    .insert(update)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/app/projects");
  redirect(`/app/projects/${data.id}`);
}

export async function updateProject(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title_en = String(formData.get("title_en") ?? "").trim();
  if (!title_en) throw new Error("title_en is required");

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = await ensureUniqueSlug(slugify(rawSlug || title_en), id);
  const update = {
    slug,
    title_en,
    title_ka: String(formData.get("title_ka") ?? "").trim() || null,
    location_en: String(formData.get("location_en") ?? "").trim() || null,
    location_ka: String(formData.get("location_ka") ?? "").trim() || null,
    description_en: String(formData.get("description_en") ?? "").trim() || null,
    description_ka: String(formData.get("description_ka") ?? "").trim() || null,
    published: formData.get("published") === "on",
  };
  const { error } = await sb.from("projects").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${id}`);
  revalidatePath(`/project/${slug}`);
}

export async function deleteProject(id: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: imgs } = await sb
    .from("project_images")
    .select("image_path")
    .eq("project_id", id);
  const { data: proj } = await sb
    .from("projects")
    .select("hero_image_path, slug")
    .eq("id", id)
    .single();
  const paths: string[] = [];
  for (const i of imgs ?? []) if (i.image_path) paths.push(i.image_path);
  if (proj?.hero_image_path) paths.push(proj.hero_image_path);
  if (paths.length > 0) {
    await sb.storage.from("projects").remove(paths);
  }
  await sb.from("projects").delete().eq("id", id);
  revalidatePath("/app/projects");
  redirect("/app/projects");
}

/* -------------------- Gallery -------------------- */

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function uploadProjectImage(
  formData: FormData,
): Promise<{ id: string; imagePath: string }> {
  await requireSession();
  const sb = gogaAdmin();
  const projectId = String(formData.get("projectId") ?? "");
  const file = formData.get("file");
  if (!projectId) throw new Error("projectId required");
  if (!(file instanceof File)) throw new Error("file required");
  if (file.size === 0) throw new Error("file is empty");
  if (file.size > 50 * 1024 * 1024)
    throw new Error("file too large (50 MB max)");

  const imagePath = `${projectId}/${Date.now()}-${safeFilename(file.name)}`;
  const { error: upErr } = await sb.storage
    .from("projects")
    .upload(imagePath, file, {
      contentType: file.type || "image/jpeg",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) throw new Error(`storage: ${upErr.message}`);

  const { data: existing } = await sb
    .from("project_images")
    .select("sort_order")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await sb
    .from("project_images")
    .insert({
      project_id: projectId,
      image_path: imagePath,
      sort_order: nextOrder,
    })
    .select("id")
    .single();
  if (error) {
    await sb.storage
      .from("projects")
      .remove([imagePath])
      .catch(() => {});
    throw new Error(error.message);
  }

  const { data: proj } = await sb
    .from("projects")
    .select("hero_image_path")
    .eq("id", projectId)
    .single();
  if (proj && !proj.hero_image_path) {
    await sb
      .from("projects")
      .update({ hero_image_path: imagePath })
      .eq("id", projectId);
  }

  revalidatePath(`/app/projects/${projectId}`);
  return { id: data.id, imagePath };
}

export async function setHeroImage(
  projectId: string,
  imagePath: string | null,
): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("projects")
    .update({ hero_image_path: imagePath })
    .eq("id", projectId);
  revalidatePath(`/app/projects/${projectId}`);
}

export async function reorderImages(
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  await Promise.all(
    orderedIds.map((id, idx) =>
      sb
        .from("project_images")
        .update({ sort_order: idx })
        .eq("id", id)
        .eq("project_id", projectId),
    ),
  );
  revalidatePath(`/app/projects/${projectId}`);
}

export async function updateImageCaption(
  imageId: string,
  caption: string,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("project_images")
    .update({ caption: caption.trim() || null })
    .eq("id", imageId)
    .select("project_id")
    .single();
  if (data?.project_id) revalidatePath(`/app/projects/${data.project_id}`);
}

export async function updateImageAlt(
  imageId: string,
  altText: string,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("project_images")
    .update({ alt_text: altText.trim() || null })
    .eq("id", imageId)
    .select("project_id")
    .single();
  if (data?.project_id) revalidatePath(`/app/projects/${data.project_id}`);
}

export async function deleteImage(imageId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data } = await sb
    .from("project_images")
    .select("project_id, image_path")
    .eq("id", imageId)
    .single();
  if (!data) return;
  await sb.from("project_images").delete().eq("id", imageId);
  if (data.image_path) {
    await sb.storage.from("projects").remove([data.image_path]);
  }
  revalidatePath(`/app/projects/${data.project_id}`);
}
