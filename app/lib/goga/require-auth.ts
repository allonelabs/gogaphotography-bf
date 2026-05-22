import "server-only";

import { auth } from "@/auth";

/**
 * Photographer-admin auth gate.
 *
 * BF's stock pattern is multi-tenant via `createOrgScopedSupabaseClient()`,
 * but our app is single-tenant — there's exactly one studio. We just need
 * a signed-in session; org membership doesn't apply. Server actions and
 * route handlers call `requireSession()` and trust the result.
 */
export async function requireSession(): Promise<{
  email: string;
  name: string | null;
}> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    throw new Error("unauthorized");
  }
  return { email, name: session?.user?.name ?? null };
}
