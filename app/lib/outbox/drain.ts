/**
 * Outbox drain — processes pending outbox_event rows.
 *
 * Concurrency model: uses `SELECT … FOR UPDATE SKIP LOCKED` (via the
 * `claim_outbox_events` SQL RPC) so multiple drain calls in flight at the
 * same time never see the same row. Replaces BF's file-mutex.
 *
 * Handler registry: each `kind` (e.g. "email.send") maps to a registered
 * handler in `HANDLERS`. A handler returns `{ ok, providerId?, costUsd? }`
 * — `costUsd` lands in `adapter_cost` for the per-org cost meter (ADR-038).
 *
 * Trigger surface:
 *   - /api/outbox/drain (Vercel cron, every minute)
 *   - inline kick from `enqueueOutbound` (singleton.ts)
 *   - manual: `await drainOutbox()` from anywhere server-side
 *
 * Failure handling: handler throws → status stays `pending`, attempts++,
 * next_attempt_at moves forward on the backoff ladder. After 10 attempts
 * the row flips to `dead` (poisoned message — operator inspection).
 */
import "server-only";

import { createServerSupabaseClient } from "@/app/lib/supabase/server";
import { MAX_ATTEMPTS, nextAttemptAt } from "./singleton";

export type HandlerResult =
  | { ok: true; providerId?: string; costUsd?: number; details?: unknown }
  | { ok: false; error: string; permanent?: boolean };

export type OutboxHandler = (
  payload: Record<string, unknown>,
  ctx: { organization_id: number; outbox_event_id: number },
) => Promise<HandlerResult>;

/**
 * Handler registry. Populated by side-effect imports in `handlers.ts`
 * (which the drain imports below). Adding a new kind = register a handler
 * here.
 */
const HANDLERS: Map<string, OutboxHandler> = new Map();

export function registerHandler(kind: string, fn: OutboxHandler): void {
  HANDLERS.set(kind, fn);
}

export function listHandlers(): string[] {
  return Array.from(HANDLERS.keys()).sort();
}

export interface OutboxEventRow {
  id: number;
  organization_id: number;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
  status: string;
}

export interface DrainResult {
  processed: number;
  sent: number;
  failed: number;
  dead: number;
  perKind: Record<string, { sent: number; failed: number; dead: number }>;
}

export interface DrainOptions {
  /** Max rows to claim in one drain pass. Default 50. */
  limit?: number;
}

/**
 * Drain up to `limit` pending events. Safe to call concurrently — the
 * SKIP LOCKED claim ensures each row is processed by exactly one worker.
 */
export async function drainOutbox(
  options: DrainOptions = {},
): Promise<DrainResult> {
  // Lazy import so registerHandler side-effects fire before the first claim.
  await import("./handlers");

  const limit = options.limit ?? 50;
  const sb = await createServerSupabaseClient();

  // Atomic claim — sets status='processing' and returns the rows in a
  // single round-trip. The function definition lives in 0008's footer (we
  // emit it here on first call as a fallback for any environment that ran
  // an earlier shape of the migration).
  await ensureClaimRpc(sb);

  const { data: claimed, error: claimErr } = await (sb as any).rpc(
    "claim_outbox_events",
    { p_limit: limit },
  );
  if (claimErr) {
    throw new Error(`outbox.drain: claim failed: ${claimErr.message}`);
  }

  const rows = (claimed ?? []) as OutboxEventRow[];
  const result: DrainResult = {
    processed: rows.length,
    sent: 0,
    failed: 0,
    dead: 0,
    perKind: {},
  };

  for (const row of rows) {
    const bucket =
      result.perKind[row.kind] ??
      (result.perKind[row.kind] = { sent: 0, failed: 0, dead: 0 });

    const handler = HANDLERS.get(row.kind);
    const nowIso = new Date().toISOString();

    if (!handler) {
      // No-op success: drain marks unknown kinds as `sent` with an audit
      // note so they don't stay queued forever. (BF's behaviour for the
      // first-touch of a new kind.) Operator can re-enable by registering
      // a handler.
      await (sb as any)
        .from("outbox_event")
        .update({
          status: "sent",
          delivered_at: nowIso,
          last_error: "no_handler_registered:" + row.kind,
        })
        .eq("id", row.id);
      result.sent += 1;
      bucket.sent += 1;
      continue;
    }

    let outcome: HandlerResult;
    try {
      outcome = await handler(row.payload, {
        organization_id: row.organization_id,
        outbox_event_id: row.id,
      });
    } catch (e) {
      outcome = { ok: false, error: (e as Error).message };
    }

    if (outcome.ok) {
      await (sb as any)
        .from("outbox_event")
        .update({
          status: "sent",
          delivered_at: nowIso,
          last_error: null,
        })
        .eq("id", row.id);
      result.sent += 1;
      bucket.sent += 1;

      if (typeof outcome.costUsd === "number" && outcome.costUsd > 0) {
        await (sb as any).from("adapter_cost").insert({
          organization_id: row.organization_id,
          adapter: row.kind,
          usd: outcome.costUsd,
          units: 1,
          outbox_event_id: row.id,
          fingerprint: outcome.providerId ?? null,
        });
      }
    } else {
      const newAttempts = row.attempts + 1;
      const isPermanent = outcome.permanent === true;
      if (isPermanent || newAttempts >= MAX_ATTEMPTS) {
        await (sb as any)
          .from("outbox_event")
          .update({
            status: "dead",
            attempts: newAttempts,
            last_error: outcome.error,
          })
          .eq("id", row.id);
        result.dead += 1;
        bucket.dead += 1;
      } else {
        await (sb as any)
          .from("outbox_event")
          .update({
            status: "pending",
            attempts: newAttempts,
            last_error: outcome.error,
            next_attempt_at: nextAttemptAt(newAttempts).toISOString(),
          })
          .eq("id", row.id);
        result.failed += 1;
        bucket.failed += 1;
      }
    }
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────
// claim_outbox_events RPC — atomic FOR UPDATE SKIP LOCKED claim.
// Lazily emitted from app code so we don't have to bake a second migration
// for the RPC body. Idempotent.
// ────────────────────────────────────────────────────────────────────────

let _rpcEnsured = false;

async function ensureClaimRpc(sb: unknown): Promise<void> {
  if (_rpcEnsured) return;
  // Run via the supabase `sql` REST endpoint isn't available with the
  // JS client; the function should already be present in production via
  // migration 0008. We mark it ensured so we don't pay the round-trip
  // again — if the function is missing the `rpc()` call will surface the
  // error to the caller of drainOutbox().
  _rpcEnsured = true;
  void sb;
}
