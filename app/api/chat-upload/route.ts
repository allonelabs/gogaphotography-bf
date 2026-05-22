// POST /api/chat-upload — uploads a file (image / pdf / text) to Supabase
// Storage and returns its public URL.  Used by the chat paperclip button.
//
// 2026-05-14 — Luka asked for ChatGPT-style file attachments in the side
// chat.  Path: spawns/chat-uploads/<businessId>/<timestamp>-<safe-name>.

import { getSupabaseAdmin } from '../../lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED_PREFIX = /^(image\/|application\/pdf$|text\/)/;

function jsonResponse(body: object, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function safeFilename(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80) || 'file';
  return base.toLowerCase();
}

export async function POST(req: Request): Promise<Response> {
  const ct = req.headers.get('content-type') ?? '';
  if (!ct.startsWith('multipart/form-data')) {
    return jsonResponse({ ok: false, error: 'expected multipart/form-data' }, 400);
  }
  let form: FormData;
  try { form = await req.formData(); } catch { return jsonResponse({ ok: false, error: 'invalid form data' }, 400); }
  const file = form.get('file');
  if (!file || !(file instanceof File)) return jsonResponse({ ok: false, error: 'missing file' }, 400);
  if (file.size > MAX_BYTES) return jsonResponse({ ok: false, error: `file too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 12 MB)` }, 413);
  if (!ALLOWED_PREFIX.test(file.type)) return jsonResponse({ ok: false, error: `unsupported type "${file.type}". Allowed: image/*, application/pdf, text/*` }, 415);

  const businessIdRaw = form.get('businessId');
  const businessId = typeof businessIdRaw === 'string' && /^[a-z0-9][a-z0-9.\-_]*$/i.test(businessIdRaw) ? businessIdRaw : 'shared';
  const ts = Date.now().toString(36);
  const safe = safeFilename(file.name);
  const path = `chat-uploads/${businessId}/${ts}-${safe}`;

  const sb = getSupabaseAdmin();
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from('spawns').upload(path, bytes, {
    upsert: false,
    contentType: file.type,
  });
  if (error) return jsonResponse({ ok: false, error: `upload failed: ${error.message}` }, 502);
  const url = sb.storage.from('spawns').getPublicUrl(path).data.publicUrl;

  return jsonResponse({
    ok: true,
    name: file.name,
    size: file.size,
    type: file.type,
    url,
    path,
  }, 200);
}
