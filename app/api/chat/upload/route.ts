/**
 * POST /api/chat/upload — accepts a single file from the chat composer.
 *
 * Stores it in the private `chat-uploads` Supabase Storage bucket under a
 * path prefix derived from the caller's org + email hash so files are
 * naturally tenant-isolated by path. Returns a signed URL good for 1h —
 * long enough for the chat turn to round-trip back to the model.
 *
 * Validation:
 *   - max 20 MB
 *   - MIME whitelist: PDF, common images, Excel, CSV, plain text
 *
 * The Storage objects table doesn't carry our `organization_id` column,
 * so isolation here is by *path prefix only*. The upload handler is the
 * single point of authority for what path a given user can write into,
 * which is sufficient for MVP. Tighten later with Storage RLS if needed.
 */
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const SIGN_TTL_SECONDS = 60 * 60; // 1 hour
const BUCKET = "chat-uploads";

const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/plain",
]);

function sanitizeFilename(name: string): string {
  // Strip dirs, normalize to ASCII-safe, cap length.
  const base = name.replace(/^.*[\\/]/, "");
  const clean = base
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");
  return (clean || "file").slice(0, 80);
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { message } }, { status });
}

export async function POST(req: Request) {
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: { message: (e as Error).message } },
      { status: 401 },
    );
  }
  const { client: supabase, orgId, userEmail } = scoped;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonErr("invalid multipart body");
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonErr("missing 'file' field");
  }
  if (file.size <= 0) return jsonErr("empty file");
  if (file.size > MAX_BYTES) {
    return jsonErr(
      `file exceeds ${Math.floor(MAX_BYTES / 1024 / 1024)}MB limit`,
    );
  }
  // The browser sometimes leaves type=='' (e.g. .xls drag-drop on Windows).
  // Treat empty as a soft reject and ask the user to be explicit; the
  // composer already filters by accept= but we double-check server-side.
  const mime = (file.type || "").toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    return jsonErr(`unsupported file type: ${mime || "unknown"}`);
  }

  const ts = Date.now();
  const hash = createHash("sha1").update(userEmail).digest("hex").slice(0, 12);
  const safe = sanitizeFilename(file.name);
  const path = `${orgId}/${hash}/${ts}-${safe}`;

  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await (supabase as any).storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: mime,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { ok: false, error: { message: `upload failed: ${upErr.message}` } },
      { status: 500 },
    );
  }

  const { data: signed, error: signErr } = await (supabase as any).storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL_SECONDS);
  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: { message: `sign failed: ${signErr?.message ?? "no url"}` },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    data: {
      path,
      mimeType: mime,
      name: file.name,
      size: file.size,
      signedUrl: signed.signedUrl,
    },
  });
}
