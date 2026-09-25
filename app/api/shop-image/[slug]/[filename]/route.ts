// Serve product images from Supabase Storage with the correct content-type.
//
// Supabase Storage often returns user-uploaded images with text/plain when
// auto-detection fails (mirrors the existing /api/spawn-preview pattern).
// This proxy fetches the bytes from spawns/<slug>/product-images/<filename>
// and re-emits with image/* + browser-friendly cache headers.
//
// Session-gated: this is a preview proxy for the site-spawner's admin tools,
// not a public asset host, and the underlying `getSupabaseAdmin()` client
// has no per-slug access control — an unauthenticated caller could walk
// any spawned business's product images. Also refuses to serve svg/html:
// browsers execute those as markup/script rather than rendering a flat
// image, and content-type here was previously derived from the (attacker-
// controlled) filename, not the actual bytes.

import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import { requireApiSession } from "@/app/lib/goga/require-api-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string; filename: string }>;
}

const REFUSED_EXTENSIONS = /\.(svg|html?|xhtml)$/i;

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

export async function GET(_req: Request, { params }: Props): Promise<Response> {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;

  const { slug, filename } = await params;
  // Validate path components — no traversal, no nested directories.
  if (
    !/^[a-z0-9][a-z0-9._-]*$/i.test(slug) ||
    !/^[a-z0-9][a-z0-9._-]*$/i.test(filename)
  ) {
    return new Response("Invalid path", { status: 400 });
  }
  if (REFUSED_EXTENSIONS.test(filename)) {
    return new Response("Unsupported file type", { status: 415 });
  }
  const sb = getSupabaseAdmin();
  const path = `${slug}/product-images/${filename}`;
  const { data: pub } = sb.storage.from("spawns").getPublicUrl(path);
  try {
    const upstream = await fetch(pub.publicUrl, { cache: "no-store" });
    if (!upstream.ok) return new Response("Not found", { status: 404 });
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        "content-type": contentTypeForFilename(filename),
        "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Image fetch failed", { status: 502 });
  }
}
