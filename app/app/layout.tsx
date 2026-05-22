import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SessionProviderClient } from "./_components/SessionProviderClient";

// Server-side defense-in-depth: every page under /app gets this layout, and
// it runs on the edge before any client JS hydrates. If there's no session
// the operator never sees a flash of cached dashboard HTML — they get a
// 307 to /signin instead. The AuthGuard client component still runs on top
// of this to catch the case where the session expires while the tab is
// open and a soft client-side nav happens.
//
// SessionProviderClient wraps the tree so `useSession()` / `useHasPermission`
// work in every client component below — used to gate UI buttons per role.
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }
  return <SessionProviderClient>{children}</SessionProviderClient>;
}
