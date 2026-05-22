/**
 * Server-side permission helpers.
 *
 * These read from the NextAuth session, which is augmented in `auth.ts` to
 * include `role` and `permissions` on the user object. The permission list is
 * cached in the JWT so subsequent requests don't hit Postgres.
 */
import { auth } from "@/auth";

export interface SessionAuthz {
  email: string | null;
  role: string | null;
  permissions: string[];
}

export async function getSessionAuthz(): Promise<SessionAuthz> {
  const session = await auth();
  const user = (session?.user as Record<string, unknown> | undefined) ?? {};
  return {
    email: (user.email as string | null) ?? null,
    role: (user.role as string | null) ?? null,
    permissions: Array.isArray(user.permissions)
      ? (user.permissions as string[])
      : [],
  };
}

/**
 * `admin.all` is the implicit "I have everything" grant. Anyone with it
 * passes any check. The role `admin` gets it by seed.
 */
export async function userHasPermission(code: string): Promise<boolean> {
  const { permissions } = await getSessionAuthz();
  if (permissions.includes("admin.all")) return true;
  return permissions.includes(code);
}

/**
 * Throw a not-found (NOT a 403 redirect) when the user lacks the permission.
 * Use this in server components / pages where you want to hide the route's
 * existence from unauthorized users.
 */
export async function requirePermission(code: string): Promise<void> {
  const ok = await userHasPermission(code);
  if (!ok) {
    const { notFound } = await import("next/navigation");
    notFound();
  }
}

/**
 * Standardized 403 JSON response for API routes.
 */
export function forbiddenResponse(message = "Not permitted") {
  const { NextResponse } =
    require("next/server") as typeof import("next/server");
  return NextResponse.json(
    { ok: false, error: { code: "forbidden", message } },
    { status: 403 },
  );
}

/**
 * Helper for API routes: check the permission, return the 403 response if not
 * allowed, else null. Use as `const fail = await requireApiPermission("hotels.write"); if (fail) return fail;`.
 */
export async function requireApiPermission(code: string) {
  const ok = await userHasPermission(code);
  if (ok) return null;
  return forbiddenResponse();
}
