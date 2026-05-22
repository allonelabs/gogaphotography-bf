/**
 * Outbox singleton — durable async event delivery, Postgres-backed.
 *
 * Adapted from Business Forge's `bridge-outbox-singleton.ts`. Where BF used
 * a file-mutex + JSON snapshot to coordinate a single writer across
 * Next.js HMR boots, we use Postgres `SELECT … FOR UPDATE SKIP LOCKED`
 * (in `drain.ts`) so multiple drain workers can run concurrently without
 * double-delivery.
 *
 * Public surface:
 *   - enqueueOutbound({ kind, organization_id, payload, idempotencyKey? })
 *       → INSERTs into outbox_event and (best-effort) kicks an inline drain
 *
 * Retry policy: 10-step exponential backoff ladder (1s → 12h) before the
 * row flips to `dead`. Same defaults as BF.
 *
 * Side note: this module imports server-only and is safe to call from
 * any API route or server action. Do NOT import from a client component.
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";

/** BF's Auto-540 backoff ladder, in ms. 10 attempts then `dead`. */
export const BACKOFF_LADDER_MS: number[] = [
  1_000, 5_000, 30_000, 120_000, 600_000, 1_800_000, 3_600_000, 7_200_000,
  21_600_000, 43_200_000,
];

export const MAX_ATTEMPTS = BACKOFF_LADDER_MS.length;

export interface EnqueueOutboundInput {
  /**
   * Event kind. Doubles as the handler key + the `adapter` column for cost
   * tracking. Examples:
   *   - "email.send"
   *   - "stripe.charge"
   *   - "whatsapp.message"
   *   - "automation.run"
   *   - "webhook.outbound"
   */
  kind: string;
  organization_id: number;
  payload: Record<string, unknown>;
  /**
   * Optional dedup key — `(organization_id, idempotency_key)` is a unique
   * index, so passing the same key twice in the same org returns the
   * existing row's id without inserting a second copy.
   */
  idempotencyKey?: string;
  /**
   * If false, the inline drain after enqueue is skipped. Useful when the
   * caller is itself inside a drain and would otherwise re-enter.
   */
  triggerInlineDrain?: boolean;
}

export interface EnqueueOutboundResult {
  id: number;
  inserted: boolean;
}

export async function enqueueOutbound(
  input: EnqueueOutboundInput,
): Promise<EnqueueOutboundResult> {
  const sb = await createServerSupabaseClient();

  // Idempotency path: if a key is given, try select first.
  if (input.idempotencyKey) {
    const { data: existing } = await (sb as any)
      .from("outbox_event")
      .select("id")
      .eq("organization_id", input.organization_id)
      .eq("idempotency_key", input.idempotencyKey)
      .limit(1)
      .maybeSingle();
    if (existing?.id) return { id: existing.id, inserted: false };
  }

  const { data, error } = await (sb as any)
    .from("outbox_event")
    .insert({
      organization_id: input.organization_id,
      kind: input.kind,
      payload: input.payload,
      idempotency_key: input.idempotencyKey ?? null,
      status: "pending",
      attempts: 0,
    })
    .select("id")
    .single();

  if (error) {
    // Race against the unique idempotency index — re-fetch.
    if (input.idempotencyKey && /duplicate key/i.test(error.message)) {
      const { data: existing } = await (sb as any)
        .from("outbox_event")
        .select("id")
        .eq("organization_id", input.organization_id)
        .eq("idempotency_key", input.idempotencyKey)
        .limit(1)
        .maybeSingle();
      if (existing?.id) return { id: existing.id, inserted: false };
    }
    throw new Error(`outbox.enqueue failed: ${error.message}`);
  }

  // Best-effort inline drain — fire-and-forget. The cron at /api/outbox/drain
  // (every minute via vercel.json) is the durability guarantee. This just
  // shortens the latency on the happy path.
  if (input.triggerInlineDrain !== false) {
    // Lazy import to avoid a circular dependency: drain.ts imports
    // handlers which themselves call enqueueOutbound for chained events.
    void import("./drain")
      .then(({ drainOutbox }) => drainOutbox({ limit: 10 }))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.warn("[outbox] inline drain failed (cron will retry)", e);
      });
  }

  return { id: data.id, inserted: true };
}

/**
 * Compute the next attempt timestamp from the current attempt count. Mirrors
 * BF's markFailed logic, exposed for drain.ts to use after a transient
 * handler error.
 */
export function nextAttemptAt(attempts: number, now: Date = new Date()): Date {
  const idx = Math.min(attempts - 1, BACKOFF_LADDER_MS.length - 1);
  const ms = BACKOFF_LADDER_MS[idx] ?? 600_000;
  return new Date(now.getTime() + ms);
}
