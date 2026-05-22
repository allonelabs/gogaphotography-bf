// Serve product images from Supabase Storage with the correct content-type.
//
// Supabase Storage often returns user-uploaded images with text/plain when
// auto-detection fails (mirrors the existing /api/spawn-preview pattern).
// This proxy fetches the bytes from spawns/<slug>/product-images/<filename>
// and re-emits with image/* + browser-friendly cache headers.

import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ slug: string; filename: string }> }

function contentTypeForFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  return 'application/octet-stream';
}

export async function GET(_req: Request, { params }: Props): Promise<Response> {
  const { slug, filename } = await params;
  // Validate path components — no traversal, no nested directories.
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slug) || !/^[a-z0-9][a-z0-9._-]*$/i.test(filename)) {
    return new Response('Invalid path', { status: 400 });
  }
  const sb = getSupabaseAdmin();
  const path = `${slug}/product-images/${filename}`;
  const { data: pub } = sb.storage.from('spawns').getPublicUrl(path);
  try {
    const upstream = await fetch(pub.publicUrl, { cache: 'no-store' });
    if (!upstream.ok) return new Response('Not found', { status: 404 });
    const bytes = await upstream.arrayBuffer();
    return new Response(bytes, {
      status: 200,
      headers: {
        'content-type': contentTypeForFilename(filename),
        'cache-control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch {
    return new Response('Image fetch failed', { status: 502 });
  }
}
