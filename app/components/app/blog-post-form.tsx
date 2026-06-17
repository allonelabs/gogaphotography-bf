// app/components/app/blog-post-form.tsx
"use client";
import { useState } from "react";
import { SingleEditor } from "./BlogEditor";
import type {
  BlogPostRow,
  BlogCategoryRow,
  BlogTagRow,
} from "@/app/lib/db/blog-types";

export function BlogPostForm({
  action,
  post,
  categories,
  tags,
  selectedTagIds = [],
}: {
  action: (fd: FormData) => void;
  post?: BlogPostRow;
  categories: BlogCategoryRow[];
  tags: BlogTagRow[];
  selectedTagIds?: string[];
}) {
  const [lang, setLang] = useState<"ka" | "en">("ka");
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-[14px]";
  const tabBtn = (active: boolean) =>
    `px-3 py-1.5 text-sm rounded-t ${active ? "bg-black text-white" : "bg-black/5"}`;

  return (
    <form action={action} className="max-w-3xl space-y-5">
      <div className="flex gap-1">
        <button
          type="button"
          className={tabBtn(lang === "ka")}
          onClick={() => setLang("ka")}
        >
          ქართული
        </button>
        <button
          type="button"
          className={tabBtn(lang === "en")}
          onClick={() => setLang("en")}
        >
          English
        </button>
      </div>

      <div className={lang === "ka" ? "space-y-4" : "hidden"}>
        <label className="block text-[13px]">
          სათაური (KA)
          <input
            name="title_ka"
            defaultValue={post?.title_ka ?? ""}
            className={field}
          />
        </label>
        <label className="block text-[13px]">
          ანონსი (KA)
          <textarea
            name="excerpt_ka"
            defaultValue={post?.excerpt_ka ?? ""}
            rows={2}
            className={field}
          />
        </label>
        <div>
          <span className="text-[13px]">ტექსტი (KA)</span>
          <SingleEditor name="body_ka" initialHTML={post?.body_ka ?? ""} />
        </div>
      </div>

      <div className={lang === "en" ? "space-y-4" : "hidden"}>
        <label className="block text-[13px]">
          Title (EN)
          <input
            name="title_en"
            defaultValue={post?.title_en ?? ""}
            className={field}
          />
        </label>
        <label className="block text-[13px]">
          Excerpt (EN)
          <textarea
            name="excerpt_en"
            defaultValue={post?.excerpt_en ?? ""}
            rows={2}
            className={field}
          />
        </label>
        <div>
          <span className="text-[13px]">Body (EN)</span>
          <SingleEditor name="body_en" initialHTML={post?.body_en ?? ""} />
        </div>
      </div>

      {!post && (
        <label className="block text-[13px]">
          Slug (optional)
          <input name="slug" className={field} />
        </label>
      )}
      <label className="block text-[13px]">
        Category
        <select
          name="category_id"
          defaultValue={post?.category_id ?? ""}
          className={field}
        >
          <option value="">— none —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name_en || c.name_ka || c.slug}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="rounded-lg border border-black/10 p-3">
        <legend className="text-[13px]">Tags</legend>
        <div className="flex flex-wrap gap-3">
          {tags.map((t) => (
            <label key={t.id} className="flex items-center gap-1 text-sm">
              <input
                type="checkbox"
                name="tag_ids"
                value={t.id}
                defaultChecked={selectedTagIds.includes(t.id)}
              />
              {t.name_en || t.name_ka || t.slug}
            </label>
          ))}
          {tags.length === 0 && (
            <span className="text-xs text-neutral-400">
              No tags yet — add some under Taxonomy.
            </span>
          )}
        </div>
      </fieldset>
      <label className="block text-[13px]">
        Cover image{" "}
        {post?.cover_image_path && (
          <span className="text-xs text-neutral-400">(kept if empty)</span>
        )}
        <input
          name="cover"
          type="file"
          accept="image/*"
          className="mt-1 block"
        />
      </label>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="status"
            value="published"
            defaultChecked={post?.status === "published"}
          />{" "}
          Published
        </label>
        <label className="text-[13px]">
          Publish date
          <input
            type="date"
            name="published_at"
            defaultValue={
              post?.published_at ? post.published_at.slice(0, 10) : ""
            }
            className="ml-2 rounded border border-black/10 px-2 py-1 text-sm"
          />
        </label>
      </div>
      <button className="rounded-full bg-[var(--ao-accent)] px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white">
        {post ? "Save" : "Create"}
      </button>
    </form>
  );
}
