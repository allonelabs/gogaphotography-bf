/**
 * Email send — Resend integration through the outbox.
 *
 * Public surface:
 *   - sendEmail({ to, subject, html, text?, from?, organization_id })
 *     → enqueues an `email.send` outbox event + creates a queued `email_log`
 *       row. Returns the outbox event id. The drain (cron + inline) actually
 *       calls Resend.
 *
 * Why outbox instead of direct send? Resend is rate-limited, can fail
 * transiently, and we want a single retry/cost-counting surface (BF
 * ADR-035 / ADR-038). Direct callers never block on the network.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { enqueueOutbound } from "@/app/lib/outbox/singleton";

const DEFAULT_FROM = "AllOnce <noreply@allonelabs.com>";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  organization_id: number;
  /** Optional dedup key — same `(org_id, key)` collapses to one send. */
  idempotencyKey?: string;
  /** Loose metadata blob — surfaced in the email.send payload. */
  metadata?: Record<string, unknown>;
}

export interface SendEmailResult {
  outboxEventId: number;
  emailLogId: number;
}

export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  const from = input.from ?? (await resolveFromForOrg(input.organization_id));

  const enq = await enqueueOutbound({
    kind: "email.send",
    organization_id: input.organization_id,
    payload: {
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      from,
      metadata: input.metadata ?? null,
    },
    ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
  });

  const sb = await createServerSupabaseClient();
  const { data: logged, error } = await (sb as any)
    .from("email_log")
    .insert({
      organization_id: input.organization_id,
      outbox_event_id: enq.id,
      to_email: input.to,
      from_email: from,
      subject: input.subject,
      status: "queued",
    })
    .select("id")
    .single();

  if (error) {
    // Outbox already enqueued — log creation failure is non-fatal but
    // observable.
    // eslint-disable-next-line no-console
    console.warn("[email.send] email_log insert failed", error.message);
    return { outboxEventId: enq.id, emailLogId: -1 };
  }

  return { outboxEventId: enq.id, emailLogId: logged.id };
}

/**
 * Resolve the From: header for an org. v1 just returns the global default;
 * a future iteration reads from an `organization.email_from` column or a
 * per-org sender_config table.
 */
async function resolveFromForOrg(orgId: number): Promise<string> {
  void orgId;
  return DEFAULT_FROM;
}
