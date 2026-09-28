// app/app/blog/[id]/page.tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import {
  getPostById,
  listCategories,
  listTags,
  getPostTagIds,
} from "@/app/lib/goga/blog";
import { updatePost, deletePost } from "@/app/lib/goga/actions-blog";
import { BlogPostForm } from "@/app/components/app/blog-post-form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tr = await getServerTr();
  const [post, categories, tags] = await Promise.all([
    getPostById(id),
    listCategories(),
    listTags(),
  ]);
  if (!post) notFound();
  const selectedTagIds = await getPostTagIds(id);
  const update = updatePost.bind(null, id);
  const del = deletePost.bind(null, id);
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Content", "კონტენტი") },
        { label: tr("Blog", "ბლოგი"), href: "/admin/blog" },
        { label: post.title_en || post.title_ka || tr("Post", "პოსტი") },
      ]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel={tr("Blog", "ბლოგი")}
    >
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-semibold text-[var(--ink-900)]">
          {tr("Edit post", "პოსტის რედაქტირება")}
        </h1>
        <BlogPostForm
          action={update}
          post={post}
          categories={categories}
          tags={tags}
          selectedTagIds={selectedTagIds}
        />
        <form action={del}>
          <button className="text-sm text-red-600 underline">
            {tr("Delete post", "პოსტის წაშლა")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
