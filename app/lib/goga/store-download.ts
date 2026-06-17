// app/lib/goga/store-download.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type { StoreDownloadRow } from "@/app/lib/db/store-types";

export type DownloadAssessment =
  | { ok: true }
  | { ok: false; reason: "expired" | "limit" };

/** Pure check: is this download row currently usable? */
export function assessDownload(
  row: StoreDownloadRow,
  now: Date,
): DownloadAssessment {
  if (new Date(row.expires_at).getTime() <= now.getTime())
    return { ok: false, reason: "expired" };
  if (row.downloads_used >= row.max_downloads)
    return { ok: false, reason: "limit" };
  return { ok: true };
}

export type ResolveResult =
  | { ok: true; signedUrl: string }
  | { ok: false; status: number; message: string };

/**
 * Validate a download token, atomically consume one use, and return a
 * short-lived signed URL for the product file. Server-only.
 */
export async function resolveDownload(token: string): Promise<ResolveResult> {
  const sb = gogaAdmin();
  const { data: row } = await sb
    .from("store_downloads")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!row)
    return { ok: false, status: 404, message: "Unknown download token" };

  const verdict = assessDownload(row as StoreDownloadRow, new Date());
  if (!verdict.ok) {
    return {
      ok: false,
      status: 410,
      message:
        verdict.reason === "expired"
          ? "Link expired"
          : "Download limit reached",
    };
  }

  const { data: product } = await sb
    .from("store_products")
    .select("file_path")
    .eq("id", row.product_id)
    .maybeSingle();
  if (!product?.file_path)
    return { ok: false, status: 404, message: "File missing" };

  const { data: signed, error } = await sb.storage
    .from("store-files")
    .createSignedUrl(product.file_path, 120);
  if (error || !signed)
    return { ok: false, status: 500, message: "Could not sign URL" };

  // Consume one use (best-effort; the signed URL is the real gate for the 120s window).
  await sb
    .from("store_downloads")
    .update({
      downloads_used: row.downloads_used + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { ok: true, signedUrl: signed.signedUrl };
}
