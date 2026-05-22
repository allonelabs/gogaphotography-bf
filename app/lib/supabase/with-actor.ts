/**
 * Server-side Supabase client that threads the current user's email into the
 * `audit.actor_email` GUC via an RPC call. The audit_trigger() defined in
 * 0004_rbac_audit.sql reads that GUC and records it on every row in audit_log.
 *
 * Use this wrapper anywhere a write (insert/update/delete) is performed so
 * the actor is captured.
 *
 * Note: Supabase JS uses connection pooling (PgBouncer / transaction mode),
 * so `SET LOCAL` is not durable across statements outside the same
 * transaction. To avoid that, `set_actor_email` uses `set_config(..., false)`
 * (i.e. SET, not SET LOCAL) so the value sticks for the lifetime of the
 * pooled connection. With transaction pooling that's per-transaction;
 * with session pooling it's per-session. Either way, the next call before
 * a write reliably sets it.
 */
import { auth } from "@/auth";
import { createServerSupabaseClient } from "./server";

export async function createServerSupabaseClientWithAudit() {
  const client = await createServerSupabaseClient();
  const session = await auth();
  const email = session?.user?.email ?? "anonymous";
  // Best-effort: don't block the request if the RPC fails — audit_log will
  // still capture the row, just without an actor.
  try {
    await (client as any).rpc("set_actor_email", { email });
  } catch {
    /* swallow */
  }
  return client;
}
