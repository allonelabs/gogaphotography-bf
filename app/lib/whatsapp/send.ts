/**
 * WhatsApp send — Meta Cloud API integration through the outbox.
 *
 * Public surface:
 *   - sendWhatsApp({ organization_id, to, body })
 *       → upserts a whatsapp_thread, inserts a queued whatsapp_message row,
 *         enqueues a `whatsapp.send` outbox event. Returns
 *         `{ outboxEventId, messageId }`. Delivery happens async via the
 *         outbox drain (see `app/lib/whatsapp/handler.ts`).
 *
 * Same dura-async pattern as `app/lib/email/send.ts` — direct callers
 * never block on Meta's API.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { enqueueOutbound } from "@/app/lib/outbox/singleton";

const E164 = /^\+\d{8,15}$/;

export class WhatsAppNotConfigured extends Error {
  constructor(message = "WhatsApp not configured for this organization") {
    super(message);
    this.name = "WhatsAppNotConfigured";
  }
}

export interface SendWhatsAppInput {
  organization_id: number;
  to: string;
  body: string;
}

export interface SendWhatsAppResult {
  outboxEventId: number;
  messageId: number;
}

export async function sendWhatsApp(
  input: SendWhatsAppInput,
): Promise<SendWhatsAppResult> {
  const to = input.to.trim();
  if (!E164.test(to)) {
    throw new Error("WhatsApp: `to` must be E.164 (e.g. +995555123456)");
  }
  const body = (input.body ?? "").trim();
  if (!body) {
    throw new Error("WhatsApp: `body` is required");
  }
  if (body.length > 4096) {
    throw new Error("WhatsApp: body exceeds 4096 chars");
  }

  const sb = (await createServerSupabaseClient()) as unknown as {
    from: (t: string) => any;
  };

  // 1. Verify the org has an enabled WhatsApp integration. We only read the
  //    enabled flag here — the handler reloads creds fresh at send time to
  //    keep the outbox payload free of secrets.
  const { data: integ, error: integErr } = await (sb as any)
    .from("org_integration")
    .select("id, enabled, config")
    .eq("organization_id", input.organization_id)
    .eq("kind", "whatsapp")
    .maybeSingle();
  if (integErr) {
    throw new Error(`whatsapp.send: ${integErr.message}`);
  }
  if (!integ || !integ.enabled) {
    throw new WhatsAppNotConfigured();
  }
  const phone_number_id = (integ.config as { phone_number_id?: string } | null)
    ?.phone_number_id;
  if (!phone_number_id) {
    throw new WhatsAppNotConfigured(
      "WhatsApp integration is enabled but missing phone_number_id",
    );
  }

  // 2. Upsert the thread for this (org, contact). Returning id either way.
  const thread = await upsertThread(sb, input.organization_id, to, body);

  // 3. Insert the outbound message row, queued.
  const { data: msg, error: msgErr } = await (sb as any)
    .from("whatsapp_message")
    .insert({
      organization_id: input.organization_id,
      thread_id: thread.id,
      direction: "outbound",
      body,
      status: "queued",
    })
    .select("id")
    .single();
  if (msgErr || !msg) {
    throw new Error(
      `whatsapp.send: insert message failed: ${msgErr?.message ?? "unknown"}`,
    );
  }

  // 4. Enqueue. Payload carries only the message id + to (for observability);
  //    the handler reloads creds + body straight from the DB.
  const enq = await enqueueOutbound({
    kind: "whatsapp.send",
    organization_id: input.organization_id,
    payload: {
      messageId: msg.id,
      to,
    },
  });

  return { outboxEventId: enq.id, messageId: msg.id };
}

async function upsertThread(
  sb: { from: (t: string) => any },
  orgId: number,
  phone: string,
  preview: string,
): Promise<{ id: number }> {
  // Try select first. If hit, update last_message_at + preview. Else insert.
  const { data: existing } = await sb
    .from("whatsapp_thread")
    .select("id")
    .eq("organization_id", orgId)
    .eq("contact_phone", phone)
    .maybeSingle();

  const previewShort = preview.slice(0, 200);

  if (existing?.id) {
    await sb
      .from("whatsapp_thread")
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: previewShort,
      })
      .eq("id", existing.id);
    return { id: existing.id };
  }

  const { data: inserted, error } = await sb
    .from("whatsapp_thread")
    .insert({
      organization_id: orgId,
      contact_phone: phone,
      last_message_at: new Date().toISOString(),
      last_message_preview: previewShort,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    throw new Error(
      `whatsapp.send: upsertThread failed: ${error?.message ?? "unknown"}`,
    );
  }
  return { id: inserted.id };
}
