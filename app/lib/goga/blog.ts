// app/lib/goga/blog.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  BlogPostRow,
  BlogCategoryRow,
  BlogTagRow,
} from "@/app/lib/db/blog-types";

export interface PostListFilter {
  categorySlug?: string;
  tagSlug?: string;
}

export async function listPublishedPosts(
  filter: PostListFilter = {},
): Promise<BlogPostRow[]> {
  const sb = gogaAdmin();
  let postIds: string[] | null = null;

  if (filter.tagSlug) {
    const { data: tag } = await sb
      .from("blog_tags")
      .select("id")
      .eq("slug", filter.tagSlug)
      .maybeSingle();
    if (!tag) return [];
    const { data: links } = await sb
      .from("blog_post_tags")
      .select("post_id")
      .eq("tag_id", tag.id);
    postIds = (links ?? []).map((l) => l.post_id);
    if (postIds.length === 0) return [];
  }

  let q = sb
    .from("blog_posts")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (filter.categorySlug) {
    const { data: cat } = await sb
      .from("blog_categories")
      .select("id")
      .eq("slug", filter.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    q = q.eq("category_id", cat.id);
  }
  if (postIds) q = q.in("id", postIds);

  const { data, error } = await q;
  if (error) throw new Error(`listPublishedPosts: ${error.message}`);
  return (data ?? []) as BlogPostRow[];
}

export async function getPublishedPostBySlug(
  slug: string,
): Promise<BlogPostRow | null> {
  const { data } = await gogaAdmin()
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as BlogPostRow) ?? null;
}

export async function listAllPosts(): Promise<BlogPostRow[]> {
  const { data, error } = await gogaAdmin()
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAllPosts: ${error.message}`);
  return (data ?? []) as BlogPostRow[];
}

export async function getPostById(id: string): Promise<BlogPostRow | null> {
  const { data } = await gogaAdmin()
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as BlogPostRow) ?? null;
}

export async function listCategories(): Promise<BlogCategoryRow[]> {
  const { data } = await gogaAdmin()
    .from("blog_categories")
    .select("*")
    .order("name_en");
  return (data ?? []) as BlogCategoryRow[];
}

export async function listTags(): Promise<BlogTagRow[]> {
  const { data } = await gogaAdmin()
    .from("blog_tags")
    .select("*")
    .order("name_en");
  return (data ?? []) as BlogTagRow[];
}

export async function getPostTagIds(postId: string): Promise<string[]> {
  const { data } = await gogaAdmin()
    .from("blog_post_tags")
    .select("tag_id")
    .eq("post_id", postId);
  return (data ?? []).map((r) => r.tag_id);
}
