// app/lib/goga/actions-blog.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { sanitizeBlogHtml } from "./blog-sanitize";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9Ⴀ-ჿ]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniquePostSlug(base: string): Promise<string> {
  const sb = gogaAdmin();
  const root = slugify(base) || `post-${Date.now()}`;
  let slug = root;
  let n = 1;
  for (;;) {
    const { data } = await sb
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

async function uploadCover(file: File): Promise<string> {
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `blog/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("projects").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`cover upload: ${error.message}`);
  return path;
}

async function setPostTags(postId: string, tagIds: string[]): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("blog_post_tags").delete().eq("post_id", postId);
  if (tagIds.length > 0) {
    await sb
      .from("blog_post_tags")
      .insert(tagIds.map((tag_id) => ({ post_id: postId, tag_id })));
  }
}

function readPostFields(fd: FormData) {
  const status = fd.get("status") === "published" ? "published" : "draft";
  const publishedRaw = String(fd.get("published_at") ?? "").trim();
  return {
    title_ka: String(fd.get("title_ka") ?? "").trim(),
    title_en: String(fd.get("title_en") ?? "").trim(),
    excerpt_ka: String(fd.get("excerpt_ka") ?? "").trim(),
    excerpt_en: String(fd.get("excerpt_en") ?? "").trim(),
    body_ka: sanitizeBlogHtml(String(fd.get("body_ka") ?? "")),
    body_en: sanitizeBlogHtml(String(fd.get("body_en") ?? "")),
    category_id: String(fd.get("category_id") ?? "").trim() || null,
    status,
    published_at:
      status === "published"
        ? publishedRaw
          ? new Date(publishedRaw).toISOString()
          : new Date().toISOString()
        : null,
  };
}

export async function createPost(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readPostFields(formData);
  if (!fields.title_ka && !fields.title_en)
    throw new Error("A title (KA or EN) is required");
  const slug = await uniquePostSlug(
    String(formData.get("slug") ?? "") || fields.title_en || fields.title_ka,
  );
  const cover = formData.get("cover") as File | null;
  const cover_image_path =
    cover && cover.size > 0 ? await uploadCover(cover) : null;

  const { data, error } = await sb
    .from("blog_posts")
    .insert({
      slug,
      ...fields,
      cover_image_path,
    } as import("@/app/lib/db/blog-types").BlogPostRow)
    .select("id")
    .single();
  if (error || !data) throw new Error(`createPost: ${error?.message}`);

  const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);
  await setPostTags(data.id, tagIds);

  revalidatePath("/app/blog");
  revalidatePath("/blog");
  redirect("/app/blog");
}

export async function updatePost(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const fields = readPostFields(formData);
  const patch: Record<string, unknown> = {
    ...fields,
    updated_at: new Date().toISOString(),
  };
  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0)
    patch.cover_image_path = await uploadCover(cover);

  const { error } = await sb
    .from("blog_posts")
    .update(patch as import("@/app/lib/db/blog-types").BlogPostRow)
    .eq("id", id);
  if (error) throw new Error(`updatePost: ${error.message}`);

  const tagIds = formData.getAll("tag_ids").map(String).filter(Boolean);
  await setPostTags(id, tagIds);

  revalidatePath("/app/blog");
  revalidatePath("/blog");
  redirect("/app/blog");
}

export async function deletePost(id: string): Promise<void> {
  await requireSession();
  const { error } = await gogaAdmin().from("blog_posts").delete().eq("id", id);
  if (error) throw new Error(`deletePost: ${error.message}`);
  revalidatePath("/app/blog");
  revalidatePath("/blog");
}

// --- taxonomy ---
export async function createCategory(formData: FormData): Promise<void> {
  await requireSession();
  const name_en = String(formData.get("name_en") ?? "").trim();
  const name_ka = String(formData.get("name_ka") ?? "").trim();
  const slug =
    slugify(String(formData.get("slug") ?? "") || name_en || name_ka) ||
    `cat-${Date.now()}`;
  const { error } = await gogaAdmin()
    .from("blog_categories")
    .insert({ slug, name_en, name_ka });
  if (error) throw new Error(`createCategory: ${error.message}`);
  revalidatePath("/app/blog/taxonomy");
}

export async function deleteCategory(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("blog_categories").delete().eq("id", id);
  revalidatePath("/app/blog/taxonomy");
}

export async function createTag(formData: FormData): Promise<void> {
  await requireSession();
  const name_en = String(formData.get("name_en") ?? "").trim();
  const name_ka = String(formData.get("name_ka") ?? "").trim();
  const slug =
    slugify(String(formData.get("slug") ?? "") || name_en || name_ka) ||
    `tag-${Date.now()}`;
  const { error } = await gogaAdmin()
    .from("blog_tags")
    .insert({ slug, name_en, name_ka });
  if (error) throw new Error(`createTag: ${error.message}`);
  revalidatePath("/app/blog/taxonomy");
}

export async function deleteTag(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin().from("blog_tags").delete().eq("id", id);
  revalidatePath("/app/blog/taxonomy");
}
