// POST /api/chat-upload — uploads an image to Supabase Storage and returns
// its public URL. Used by the chat paperclip button.
//
// 2026-05-14 — Luka asked for ChatGPT-style file attachments in the side
// chat.  Path: spawns/chat-uploads/<businessId>/<timestamp>-<safe-name>.
//
// Session-gated (this is an admin tool, not a public endpoint) and image
// -only: previously any image/*, application/pdf, or text/* was accepted,
// including image/svg+xml, which Supabase Storage/browsers can render as
// live markup/script rather than a flat image.

import { getSupabaseAdmin } from "../../lib/supabase-server";
import { requireApiSession } from "@/app/lib/goga/require-api-session";
import { imageMimeFor, sniffImageType } from "@/app/lib/goga/image-magic-bytes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function safeFilename(name: string): string {
  const base =
    name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "file";
  return base.toLowerCase();
}

export async function POST(req: Request): Promise<Response> {
  const gate = await requireApiSession();
  if (!gate.ok) return gate.response;

  const ct = req.headers.get("content-type") ?? "";
  if (!ct.startsWith("multipart/form-data")) {
    return jsonResponse(
      { ok: false, error: "expected multipart/form-data" },
      400,
    );
  }
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ ok: false, error: "invalid form data" }, 400);
  }
  const file = form.get("file");
  if (!file || !(file instanceof File))
    return jsonResponse({ ok: false, error: "missing file" }, 400);
  if (file.size > MAX_BYTES)
    return jsonResponse(
      {
        ok: false,
        error: `file too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 12 MB)`,
      },
      413,
    );

  const businessIdRaw = form.get("businessId");
  const businessId =
    typeof businessIdRaw === "string" &&
    /^[a-z0-9][a-z0-9.\-_]*$/i.test(businessIdRaw)
      ? businessIdRaw
      : "shared";
  const ts = Date.now().toString(36);
  const safe = safeFilename(file.name);
  const path = `chat-uploads/${businessId}/${ts}-${safe}`;

  const bytes = Buffer.from(await file.arrayBuffer());
  // Trust the bytes, not the client-sent type — jpeg/png/webp/avif/gif
  // only, no svg (svg is markup, not a flat raster image).
  const imageType = sniffImageType(bytes);
  if (!imageType) {
    return jsonResponse(
      {
        ok: false,
        error: "unsupported type. Allowed: jpeg, png, webp, avif, gif",
      },
      415,
    );
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.storage.from("spawns").upload(path, bytes, {
    upsert: false,
    contentType: imageMimeFor(imageType),
  });
  if (error)
    return jsonResponse(
      { ok: false, error: `upload failed: ${error.message}` },
      502,
    );
  const url = sb.storage.from("spawns").getPublicUrl(path).data.publicUrl;

  return jsonResponse(
    {
      ok: true,
      name: file.name,
      size: file.size,
      type: imageMimeFor(imageType),
      url,
      path,
    },
    200,
  );
}
