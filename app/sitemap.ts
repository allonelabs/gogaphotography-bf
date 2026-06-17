// app/sitemap.ts
import type { MetadataRoute } from "next";
import { listPublishedPosts } from "@/app/lib/goga/blog";

function baseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gogaphotography-bf.vercel.app"
  ).replace(/\/$/, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = baseUrl();
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listPublishedPosts();
    postEntries = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updated_at,
    }));
  } catch {
    postEntries = [];
  }
  return [
    { url: `${base}/`, lastModified: new Date().toISOString() },
    { url: `${base}/store`, lastModified: new Date().toISOString() },
    { url: `${base}/blog`, lastModified: new Date().toISOString() },
    ...postEntries,
  ];
}
