/**
 * Org-scoped server Supabase client.
 *
 * Threads two pieces of context into the database session:
 *   1. `audit.actor_email` — captured by audit_trigger() on writes.
 *   2. `app.current_org_id` — read by the RLS policies added in 0006.
 *
 * Returns `{ client, orgId, userEmail, permissions }` so callers can:
 *   - apply `.eq("organization_id", orgId)` on selects (app-layer filter,
 *     the real safety since the service-role key bypasses RLS)
 *   - stamp `organization_id: orgId` on inserts
 *   - read `permissions` for tool-level gating
 *
 * Throws when there's no session or no org on the JWT, which is the right
 * behavior for protected API routes — callers should return 401/403.
 */
import { auth } from "@/auth";
import { createServerSupabaseClient } from "./server";

export interface OrgScopedSupabase {
  client: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  orgId: number;
  orgSlug: string | null;
  orgName: string | null;
  userEmail: string;
  userName: string | null;
  role: string | null;
  permissions: string[];
}

export async function createOrgScopedSupabaseClient(): Promise<OrgScopedSupabase> {
  const session = await auth();
  const user = (session?.user as Record<string, unknown> | undefined) ?? {};
  const email = (user.email as string | null) ?? null;
  const orgId = (user.organization_id as number | null) ?? null;
  if (!email) {
    throw new Error("with-org: no session email");
  }
  if (!orgId) {
    throw new Error("with-org: no organization in session");
  }
  const client = await createServerSupabaseClient();
  // Set the GUC for RLS (no-op for service-role queries but harmless).
  try {
    await (client as any).rpc("set_current_org", { org_id: orgId });
  } catch {
    /* swallow — RLS is defense-in-depth; the app filter is what protects */
  }
  // Set audit actor too so audit_log captures the user on writes.
  try {
    await (client as any).rpc("set_actor_email", { email });
  } catch {
    /* swallow */
  }
  return {
    client,
    orgId,
    orgSlug: (user.organization_slug as string | null) ?? null,
    orgName: (user.organization_name as string | null) ?? null,
    userEmail: email,
    userName: (user.name as string | null) ?? null,
    role: (user.role as string | null) ?? null,
    permissions: Array.isArray(user.permissions)
      ? (user.permissions as string[])
      : [],
  };
}
