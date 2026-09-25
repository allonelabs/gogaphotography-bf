import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/auth";

export type ApiSession = { email: string; name: string | null };
export type ApiSessionGate =
  | { ok: true; session: ApiSession }
  | { ok: false; response: NextResponse };

/**
 * Route-handler auth gate.
 *
 * Companion to `requireSession()` (for server actions, which throw): route
 * handlers need an actual `Response` to return, so this returns a discriminated
 * result instead of throwing. Usage:
 *
 *   const gate = await requireApiSession();
 *   if (!gate.ok) return gate.response;
 *   const { email } = gate.session;
 */
export async function requireApiSession(): Promise<ApiSessionGate> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 },
      ),
    };
  }
  return { ok: true, session: { email, name: session?.user?.name ?? null } };
}
