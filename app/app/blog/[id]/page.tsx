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

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit post" };

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
        { label: "Content" },
        { label: "Blog", href: "/app/blog" },
        { label: post.title_en || post.title_ka || "Post" },
      ]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel="Blog"
    >
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-semibold text-[var(--ink-900)]">
          Edit post
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
            Delete post
          </button>
        </form>
      </div>
    </AppShell>
  );
}
