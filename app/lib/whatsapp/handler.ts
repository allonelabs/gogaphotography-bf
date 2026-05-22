/**
 * whatsapp.send handler — called by the outbox drain.
 *
 * Reads the queued payload (just `messageId` + `to` for observability),
 * reloads the message body + the org's WhatsApp credentials from the
 * database (so secrets never live in the outbox payload), POSTs to Meta's
 * Cloud API, and updates `whatsapp_message` with the provider id +
 * status.
 *
 * Retry semantics:
 *   - 4xx (not 429)  → permanent failure, mark status='failed'
 *   - 5xx / 429      → transient, return retry (outbox handles backoff)
 *   - 2xx            → status='sent', record wa_message_id + sent_at
 *
 * Cost: Meta gives 1000 free conversations / month per WABA. After that
 * pricing is country-dependent (~$0.005–$0.02 per business-initiated
 * conversation). We record `units: 1` and `costUsd: 0` so the cost meter
 * tracks volume; per-org billing-aware metering is future work.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import type { HandlerResult } from "@/app/lib/outbox/drain";

const META_GRAPH_VERSION = "v18.0";

interface WhatsAppSendPayload {
  messageId: number;
  to: string;
}

interface IntegrationConfig {
  phone_number_id?: string;
  access_token?: string;
}

export async function handleWhatsAppSend(
  payload: Record<string, unknown>,
  ctx: { organization_id: number; outbox_event_id: number },
): Promise<HandlerResult> {
  const p = payload as unknown as WhatsAppSendPayload;
  if (!p.messageId || !p.to) {
    return {
      ok: false,
      error: "whatsapp.send: missing messageId or to",
      permanent: true,
    };
  }

  const sb = (await createServerSupabaseClient()) as any;

  // Reload the message body — secrets must not live in the outbox payload.
  const { data: msg, error: msgErr } = await sb
    .from("whatsapp_message")
    .select("id, body, status, organization_id")
    .eq("id", p.messageId)
    .maybeSingle();

  if (msgErr) {
    return {
      ok: false,
      error: `whatsapp.send: load message: ${msgErr.message}`,
    };
  }
  if (!msg) {
    return {
      ok: false,
      error: `whatsapp.send: message ${p.messageId} not found`,
      permanent: true,
    };
  }
  // Already-sent guard (idempotency against double-drain): a row in 'sent'
  // status shouldn't be re-sent if the same event somehow got reclaimed.
  if (
    msg.status === "sent" ||
    msg.status === "delivered" ||
    msg.status === "read"
  ) {
    return { ok: true };
  }

  // Belt-and-braces: don't trust the payload org for credential lookup —
  // always use the message's own organization_id.
  const orgId = msg.organization_id ?? ctx.organization_id;

  const { data: integ, error: integErr } = await sb
    .from("org_integration")
    .select("config, enabled")
    .eq("organization_id", orgId)
    .eq("kind", "whatsapp")
    .maybeSingle();

  if (integErr) {
    return {
      ok: false,
      error: `whatsapp.send: load integration: ${integErr.message}`,
    };
  }
  if (!integ || !integ.enabled) {
    await sb
      .from("whatsapp_message")
      .update({
        status: "failed",
        status_error: "integration_disabled_or_missing",
      })
      .eq("id", p.messageId);
    return {
      ok: false,
      error: "whatsapp integration not enabled",
      permanent: true,
    };
  }

  const cfg = (integ.config ?? {}) as IntegrationConfig;
  if (!cfg.phone_number_id || !cfg.access_token) {
    await sb
      .from("whatsapp_message")
      .update({
        status: "failed",
        status_error: "missing_phone_number_id_or_access_token",
      })
      .eq("id", p.messageId);
    return {
      ok: false,
      error: "whatsapp integration missing credentials",
      permanent: true,
    };
  }

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(cfg.phone_number_id)}/messages`;
  const recipient = p.to.replace(/^\+/, ""); // Meta expects digits-only

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.access_token}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: recipient,
      type: "text",
      text: { body: msg.body ?? "" },
    }),
  });

  const json = (await res.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; type?: string; code?: number };
  };

  if (!res.ok) {
    const permanent =
      res.status >= 400 && res.status < 500 && res.status !== 429;
    const errMsg = json.error?.message ?? `meta whatsapp http ${res.status}`;
    await sb
      .from("whatsapp_message")
      .update({
        status: permanent ? "failed" : "queued",
        status_error: errMsg,
      })
      .eq("id", p.messageId);
    return { ok: false, error: errMsg, permanent };
  }

  const waId = json.messages?.[0]?.id ?? null;
  await sb
    .from("whatsapp_message")
    .update({
      status: "sent",
      wa_message_id: waId,
      sent_at: new Date().toISOString(),
      status_error: null,
    })
    .eq("id", p.messageId);

  return {
    ok: true,
    costUsd: 0,
    ...(waId ? { providerId: waId } : {}),
  };
}
