/**
 * POST /api/whatsapp/send/[thread_id]
 *
 * Looks up the thread (org-scoped), validates the user has `whatsapp.send`,
 * and calls `sendWhatsApp({ organization_id, to: thread.contact_phone, body })`.
 * Returns `{ ok, messageId }` on success.
 *
 * The thread lookup is the security boundary: it confirms the thread
 * belongs to the session's org AND captures `contact_phone` server-side,
 * so the client can't address arbitrary recipients via this route.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { requireApiPermission } from "@/app/lib/auth/permissions";
import { sendWhatsApp, WhatsAppNotConfigured } from "@/app/lib/whatsapp/send";

const BodySchema = z.object({
  body: z.string().min(1).max(4096),
});

function bad(message: string, code = "bad_input", status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function unauth(message: string) {
  return NextResponse.json(
    { ok: false, error: { code: "unauthenticated", message } },
    { status: 401 },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ thread_id: string }> },
) {
  const fail = await requireApiPermission("whatsapp.send");
  if (fail) return fail;

  const { thread_id } = await params;
  const threadId = Number(thread_id);
  if (!Number.isFinite(threadId)) return bad("invalid thread id");

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return bad(parsed.error.message);

  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  const { client: supabase, orgId } = scoped;

  const { data: thread, error: tErr } = await (supabase as any)
    .from("whatsapp_thread")
    .select("id, contact_phone")
    .eq("id", threadId)
    .eq("organization_id", orgId)
    .maybeSingle();

  if (tErr) return bad(tErr.message, "db", 500);
  if (!thread) return bad("thread not found", "not_found", 404);

  try {
    const result = await sendWhatsApp({
      organization_id: orgId,
      to: thread.contact_phone,
      body: parsed.data.body,
    });
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      outboxEventId: result.outboxEventId,
    });
  } catch (e) {
    if (e instanceof WhatsAppNotConfigured) {
      return bad(e.message, "not_configured", 412);
    }
    return bad((e as Error).message, "send_failed", 500);
  }
}
