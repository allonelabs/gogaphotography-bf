/**
 * email.send handler — called by the outbox drain.
 *
 * Reads the queued payload, calls Resend, updates `email_log.status` +
 * `provider_id`. Returns the standard outbox HandlerResult.
 *
 * Cost: Resend charges per recipient (≈$0.0004 / email on the Pro plan).
 * We log `costUsd: 0.0004` so the adapter_cost meter has signal even
 * though the absolute value is small.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import type { HandlerResult } from "@/app/lib/outbox/drain";

interface EmailSendPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

const RESEND_API = "https://api.resend.com/emails";
const COST_PER_EMAIL_USD = 0.0004;

export async function handleEmailSend(
  payload: Record<string, unknown>,
  ctx: { organization_id: number; outbox_event_id: number },
): Promise<HandlerResult> {
  const p = payload as unknown as EmailSendPayload;
  if (!p.to || !p.subject || !p.html || !p.from) {
    return {
      ok: false,
      error: "email.send: missing required fields",
      permanent: true,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY not configured",
      permanent: true,
    };
  }

  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: p.from,
      to: p.to,
      subject: p.subject,
      html: p.html,
      ...(p.text ? { text: p.text } : {}),
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  const sb = await createServerSupabaseClient();

  if (!res.ok) {
    // 4xx (except 429) = permanent. 5xx / 429 = retry.
    const permanent =
      res.status >= 400 && res.status < 500 && res.status !== 429;
    const errMsg = json.message ?? json.name ?? `resend http ${res.status}`;
    await (sb as any)
      .from("email_log")
      .update({ status: "failed", error: errMsg })
      .eq("outbox_event_id", ctx.outbox_event_id);
    return { ok: false, error: errMsg, permanent };
  }

  await (sb as any)
    .from("email_log")
    .update({
      status: "sent",
      provider_id: json.id ?? null,
      sent_at: new Date().toISOString(),
    })
    .eq("outbox_event_id", ctx.outbox_event_id);

  return {
    ok: true,
    costUsd: COST_PER_EMAIL_USD,
    ...(json.id ? { providerId: json.id } : {}),
  };
}
