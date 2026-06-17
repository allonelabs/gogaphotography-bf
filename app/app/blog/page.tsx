// app/app/blog/page.tsx
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listAllPosts } from "@/app/lib/goga/blog";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

export default async function AdminBlogPage() {
  const posts = await listAllPosts();
  return (
    <AppShell
      breadcrumb={[{ label: "Content" }, { label: "Blog" }]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel="Blog"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              Blog
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {posts.length} posts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/blog/taxonomy"
              className="text-[12px] uppercase tracking-[0.18em] text-[var(--ink-500)] underline"
            >
              Categories &amp; tags
            </Link>
            <Link
              href="/app/blog/new"
              className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
            >
              New post
            </Link>
          </div>
        </header>
        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              No posts yet — write your first one.
            </p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[var(--ink-500)]">
                <th className="py-2">Title</th>
                <th>Status</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">{p.title_ka || p.title_en || p.slug}</td>
                  <td>{p.status}</td>
                  <td>
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="text-right">
                    <Link href={`/app/blog/${p.id}`} className="underline">
                      edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
