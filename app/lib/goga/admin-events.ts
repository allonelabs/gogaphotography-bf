import "server-only";

import { gogaAdmin } from "@/app/lib/supabase/goga";
import { auth } from "@/auth";

export type AdminEventKind =
  | "lead.created"
  | "lead.stage_changed"
  | "lead.archived"
  | "lead.note_edited"
  | "booking.created"
  | "booking.status_changed"
  | "booking.note_edited"
  | "booking.deleted"
  | "contract.created"
  | "contract.sent"
  | "contract.voided"
  | "contract.signed"
  | "delivery.created"
  | "delivery.password_set"
  | "delivery.password_cleared"
  | "delivery.meta_updated"
  | "delivery.image_uploaded"
  | "delivery.image_deleted"
  | "delivery.archived"
  | "deposit.link_created"
  | "deposit.paid"
  | "deposit.failed"
  | "deposit.cancelled"
  | "package.created"
  | "package.updated"
  | "package.deleted"
  | "package.published"
  | "package.unpublished"
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "project.published"
  | "project.unpublished"
  | "project.reordered"
  | "service.created"
  | "service.updated"
  | "service.deleted"
  | "service.published"
  | "service.unpublished"
  | "hero.updated"
  | "page.updated";

/**
 * Append an audit row. Best-effort: a failed insert logs but never
 * propagates — the operator action itself must still succeed.
 *
 * Actor falls back to the NextAuth session email if not supplied.
 */
export async function logAdminEvent(
  kind: AdminEventKind,
  args: {
    entityType?: string;
    entityId?: string | null;
    payload?: Record<string, unknown>;
    actor?: string;
  } = {},
): Promise<void> {
  try {
    const sb = gogaAdmin();
    let actor = args.actor;
    if (!actor) {
      try {
        const s = await auth();
        actor = s?.user?.email ?? undefined;
      } catch {
        // Server actions outside a request scope can't call auth().
      }
    }
    // admin_events isn't in goga-types yet — cast through to satisfy TS.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from("admin_events").insert({
      kind,
      entity_type: args.entityType ?? null,
      entity_id: args.entityId ?? null,
      payload: args.payload ?? {},
      actor: actor ?? null,
    });
  } catch (e) {
    console.error("[admin-events] insert failed:", e);
  }
}

export interface AdminEventRow {
  id: string;
  kind: string;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  actor: string | null;
  created_at: string;
}

export async function listAdminEvents(args: {
  limit?: number;
  offset?: number;
  entityType?: string | null;
  entityId?: string | null;
  kind?: string | null;
}): Promise<{ rows: AdminEventRow[]; count: number | null }> {
  const sb = gogaAdmin();
  const limit = Math.min(args.limit ?? 100, 500);
  const offset = Math.max(args.offset ?? 0, 0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q = (sb as any)
    .from("admin_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });
  if (args.entityType) q = q.eq("entity_type", args.entityType);
  if (args.entityId) q = q.eq("entity_id", args.entityId);
  if (args.kind) q = q.eq("kind", args.kind);
  const { data, count } = await q.range(offset, offset + limit - 1);
  return { rows: (data ?? []) as AdminEventRow[], count: count ?? null };
}
