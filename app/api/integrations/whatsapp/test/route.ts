/**
 * POST /api/integrations/whatsapp/test
 *
 * Operator-only test send. Gated on admin/manager role (same as the
 * settings page) AND on the `whatsapp.send` permission. Calls the same
 * `sendWhatsApp` pipeline as the user-facing UI so any config issue
 * surfaces here too.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrgScopedSupabaseClient } from "@/app/lib/supabase/with-org";
import { sendWhatsApp, WhatsAppNotConfigured } from "@/app/lib/whatsapp/send";

const BodySchema = z.object({
  to: z.string().regex(/^\+\d{8,15}$/),
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

function forbidden() {
  return NextResponse.json(
    {
      ok: false,
      error: { code: "forbidden", message: "Not permitted" },
    },
    { status: 403 },
  );
}

export async function POST(req: Request) {
  let scoped;
  try {
    scoped = await createOrgScopedSupabaseClient();
  } catch (e) {
    return unauth((e as Error).message);
  }
  if (scoped.role !== "admin" && scoped.role !== "manager") return forbidden();

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return bad(parsed.error.message);

  try {
    const result = await sendWhatsApp({
      organization_id: scoped.orgId,
      to: parsed.data.to,
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
