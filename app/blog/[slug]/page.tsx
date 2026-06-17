// app/blog/[slug]/page.tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublishedPostBySlug } from "@/app/lib/goga/blog";
import { sanitizeBlogHtml } from "@/app/lib/goga/blog-sanitize";
import { normalizeLang, pickLang } from "@/app/lib/goga/blog-lang";

export const dynamic = "force-dynamic";

function coverUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const lang = normalizeLang((await searchParams).lang);
  const post = await getPublishedPostBySlug(slug);
  if (!post) return { title: "Not found" };
  const title = pickLang(post.title_ka, post.title_en, lang);
  const description = pickLang(post.excerpt_ka, post.excerpt_en, lang);
  const image = coverUrl(post.cover_image_path) ?? undefined;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : [],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { slug } = await params;
  const lang = normalizeLang((await searchParams).lang);
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const title = pickLang(post.title_ka, post.title_en, lang);
  const bodyHtml = sanitizeBlogHtml(pickLang(post.body_ka, post.body_en, lang));
  const cover = coverUrl(post.cover_image_path);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    image: cover ? [cover] : [],
    datePublished: post.published_at ?? post.created_at,
    dateModified: post.updated_at,
  };

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          className="mb-8 aspect-[16/9] w-full rounded-lg object-cover"
        />
      )}
      <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
      <div
        className="prose prose-neutral mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />
    </main>
  );
}
