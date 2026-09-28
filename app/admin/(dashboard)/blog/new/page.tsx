// app/app/blog/new/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { listCategories, listTags } from "@/app/lib/goga/blog";
import { createPost } from "@/app/lib/goga/actions-blog";
import { BlogPostForm } from "@/app/components/app/blog-post-form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "New post" };

export default async function NewPostPage() {
  const tr = await getServerTr();
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Content", "კონტენტი") },
        { label: tr("Blog", "ბლოგი"), href: "/admin/blog" },
        { label: tr("New", "ახალი") },
      ]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel={tr("Blog", "ბლოგი")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-5 text-xl font-semibold text-[var(--ink-900)]">
          {tr("New post", "ახალი პოსტი")}
        </h1>
        <BlogPostForm action={createPost} categories={categories} tags={tags} />
      </div>
    </AppShell>
  );
}
