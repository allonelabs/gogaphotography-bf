"use client";

import { SessionProvider } from "next-auth/react";

/**
 * Thin client wrapper around next-auth's SessionProvider so the server-side
 * AppLayout can stay server-only. Loaded once at /app — keeps `useSession()`
 * (and `useHasPermission`) working in every operator page below.
 */
export function SessionProviderClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
