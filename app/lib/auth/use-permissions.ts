"use client";

import { useSession } from "next-auth/react";

/**
 * Client-side permission check. Reads from the NextAuth session — the JWT
 * is augmented in `auth.ts` with `role` and `permissions`. Use to gate UI
 * (buttons, links, menu items) without making a network round-trip.
 *
 * `admin.all` is honored as an implicit "everything" grant.
 */
export function useHasPermission(code: string): boolean {
  const { data } = useSession();
  const perms =
    ((data?.user as Record<string, unknown> | undefined)?.permissions as
      | string[]
      | undefined) ?? [];
  if (perms.includes("admin.all")) return true;
  return perms.includes(code);
}

export function useRole(): string | null {
  const { data } = useSession();
  return (
    ((data?.user as Record<string, unknown> | undefined)?.role as
      | string
      | null
      | undefined) ?? null
  );
}

export function usePermissions(): string[] {
  const { data } = useSession();
  return (
    ((data?.user as Record<string, unknown> | undefined)?.permissions as
      | string[]
      | undefined) ?? []
  );
}
