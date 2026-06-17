// app/blog/page.tsx
import Link from "next/link";
import { listPublishedPosts, listCategories } from "@/app/lib/goga/blog";
import { normalizeLang, pickLang } from "@/app/lib/goga/blog-lang";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
}

export default async function BlogIndex({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; category?: string; tag?: string }>;
}) {
  const sp = await searchParams;
  const lang = normalizeLang(sp.lang);
  const [posts, categories] = await Promise.all([
    listPublishedPosts({ categorySlug: sp.category, tagSlug: sp.tag }),
    listCategories(),
  ]);
  const qs = (extra: Record<string, string>) =>
    new URLSearchParams({
      ...(lang === "en" ? { lang: "en" } : {}),
      ...extra,
    }).toString();

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">
          {lang === "ka" ? "ბლოგი" : "Blog"}
        </h1>
        <Link
          href={`/blog${lang === "ka" ? "?lang=en" : ""}`}
          className="text-sm underline"
        >
          {lang === "ka" ? "English" : "ქართული"}
        </Link>
      </div>
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/blog${lang === "en" ? "?lang=en" : ""}`}
          className="rounded-full border px-3 py-1"
        >
          {lang === "ka" ? "ყველა" : "All"}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/blog?${qs({ category: c.slug })}`}
            className="rounded-full border px-3 py-1"
          >
            {pickLang(c.name_ka, c.name_en, lang) || c.slug}
          </Link>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <Link
            key={p.id}
            href={`/blog/${p.slug}${lang === "en" ? "?lang=en" : ""}`}
            className="group block"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
              {coverUrl(p.cover_image_path) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverUrl(p.cover_image_path)!}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              )}
            </div>
            <h2 className="mt-3 text-lg font-medium">
              {pickLang(p.title_ka, p.title_en, lang)}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {pickLang(p.excerpt_ka, p.excerpt_en, lang)}
            </p>
          </Link>
        ))}
        {posts.length === 0 && (
          <p className="text-neutral-500">
            {lang === "ka" ? "პოსტები ჯერ არ არის." : "No posts yet."}
          </p>
        )}
      </div>
    </main>
  );
}
