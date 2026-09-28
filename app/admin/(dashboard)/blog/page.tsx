// app/app/blog/page.tsx
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listAllPosts } from "@/app/lib/goga/blog";
import { getServerTr } from "@/app/lib/i18n/server";
import type { BlogStatus } from "@/app/lib/db/blog-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Blog" };

function statusLabel(
  status: BlogStatus,
  tr: (en: string, ka: string) => string,
): string {
  switch (status) {
    case "draft":
      return tr("draft", "მონახაზი");
    case "published":
      return tr("published", "გამოქვეყნებული");
    default:
      return status;
  }
}

export default async function AdminBlogPage() {
  const tr = await getServerTr();
  const posts = await listAllPosts();
  return (
    <AppShell
      breadcrumb={[
        { label: tr("Content", "კონტენტი") },
        { label: tr("Blog", "ბლოგი") },
      ]}
      chatScope={{ level: "tool", tool: "blog" }}
      chatScopeLabel={tr("Blog", "ბლოგი")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-baseline justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {tr("Blog", "ბლოგი")}
            </h1>
            <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
              {tr(`${posts.length} posts`, `სულ ${posts.length} პოსტი`)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog/taxonomy"
              className="text-[12px] uppercase tracking-[0.18em] text-[var(--ink-500)] underline"
            >
              {tr("Categories & tags", "კატეგორიები და ტეგები")}
            </Link>
            <Link
              href="/admin/blog/new"
              className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-white"
            >
              {tr("New post", "ახალი პოსტი")}
            </Link>
          </div>
        </header>
        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
            <p className="text-[14px] text-[var(--ink-500)]">
              {tr(
                "No posts yet — write your first one.",
                "პოსტები ჯერ არ არის — დაწერეთ პირველი.",
              )}
            </p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left text-[var(--ink-500)]">
                <th className="py-2">{tr("Title", "სათაური")}</th>
                <th>{tr("Status", "სტატუსი")}</th>
                <th>{tr("Date", "თარიღი")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">{p.title_ka || p.title_en || p.slug}</td>
                  <td>{statusLabel(p.status, tr)}</td>
                  <td>
                    {p.published_at
                      ? new Date(p.published_at).toLocaleDateString(
                          tr("en-US", "ka-GE"),
                        )
                      : "—"}
                  </td>
                  <td className="text-right">
                    <Link href={`/admin/blog/${p.id}`} className="underline">
                      {tr("edit", "რედაქტირება")}
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
