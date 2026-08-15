// Thumbnail generation for Studio-admin uploads.
//
// The public site never puts a multi-MB original in a grid tile — it requests
// a small webp sitting next to the original:
//
//   projects/<id>/1786537957251-portrait.jpg.jpeg
//   projects/<id>/1786537957251-portrait.jpg_thumb.webp   <- the tile loads this
//
// Until now those thumbs only existed because a one-off script generated them
// for the photos we imported. Anything Goga uploaded through the admin had no
// thumb, so every tile fired a 400 at storage and fell back to the full-size
// original (269 KB instead of ~30 KB). This module closes that gap by making
// the thumb part of the upload itself.
//
// Naming MUST stay in lockstep with the two consumers:
//   - static site  data/fix-buttons.js  thumbUrl()
//   - static site  api/blog.ts          coverThumbUrl()
// Both derive the thumb path by stripping the final extension and appending
// "_thumb.webp".

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Gallery tiles (homepage grid, category pages, project pages). */
export const GALLERY_THUMB_WIDTH = 900;
/** Journal cover cards. */
export const COVER_THUMB_WIDTH = 760;

const WEBP_QUALITY = 78;

/** `foo/bar.jpeg` -> `foo/bar_thumb.webp`. Mirrors thumbUrl() on the site. */
export function thumbPathFor(path: string): string {
  return `${path.replace(/\.[a-z0-9]+$/i, "")}_thumb.webp`;
}

export type ThumbResult = {
  buf: Buffer;
  /** Intrinsic dimensions of the ORIGINAL, EXIF rotation applied. */
  width: number;
  height: number;
};

/**
 * Resize to `width` and encode webp. Returns null rather than throwing —
 * a format sharp can't decode (HEIC without libheif, a corrupt file) must
 * not fail an upload whose original already landed successfully.
 */
export async function makeThumb(
  input: Buffer,
  width: number,
): Promise<ThumbResult | null> {
  try {
    // .rotate() with no argument applies the EXIF orientation tag — phone
    // photos come in sideways otherwise, and the thumb would disagree with
    // the original the lightbox opens.
    const pipeline = sharp(input).rotate();
    const meta = await pipeline.metadata();
    const buf = await pipeline
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return {
      buf,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  } catch (err) {
    console.error("[thumbs] generate failed:", (err as Error).message);
    return null;
  }
}

/**
 * Generate and upload the thumbnail for an original that is already in
 * storage. Best-effort: on any failure the original stands on its own and
 * the site's img.onerror fallback still shows it, so we log and move on
 * instead of surfacing an error to Goga mid-upload.
 *
 * Returns the original's intrinsic dimensions when they could be read.
 */
export async function uploadThumb(
  sb: SupabaseClient,
  bucket: string,
  originalPath: string,
  input: Buffer,
  width: number = GALLERY_THUMB_WIDTH,
): Promise<{ width: number; height: number } | null> {
  const thumb = await makeThumb(input, width);
  if (!thumb) return null;

  const { error } = await sb.storage
    .from(bucket)
    .upload(thumbPathFor(originalPath), thumb.buf, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) {
    console.error("[thumbs] upload failed:", originalPath, error.message);
    return null;
  }
  return { width: thumb.width, height: thumb.height };
}
