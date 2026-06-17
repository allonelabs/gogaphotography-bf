// app/lib/db/blog-types.ts
export type BlogStatus = "draft" | "published";

export type BlogCategoryRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  created_at: string;
};

export type BlogTagRow = {
  id: string;
  slug: string;
  name_ka: string;
  name_en: string;
  created_at: string;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  title_ka: string;
  title_en: string;
  excerpt_ka: string;
  excerpt_en: string;
  body_ka: string;
  body_en: string;
  cover_image_path: string | null;
  category_id: string | null;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogPostTagRow = {
  post_id: string;
  tag_id: string;
};
