import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SessionProviderClient } from "./_components/SessionProviderClient";
import { ToasterProvider } from "./_components/Toaster";

// Server-side defense-in-depth: every page under /admin gets this layout, and
// it runs before any client JS hydrates. If there's no session the operator
// never sees a flash of cached dashboard HTML — they get a 307 to
// /admin/login instead. The AuthGuard client component still runs on top of
// this to catch the case where the session expires while the tab is open and
// a soft client-side nav happens.
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
    // No ?next= here on purpose: a server layout cannot read the requested
    // path reliably (x-matched-path is internal and absent on some runtimes).
    // AuthGuard, which runs on the client with usePathname(), adds ?next= and
    // is what actually returns the operator to a deep link after signing in.
    redirect("/admin/login");
  }
  return (
    <SessionProviderClient>
      <ToasterProvider>{children}</ToasterProvider>
    </SessionProviderClient>
  );
}
