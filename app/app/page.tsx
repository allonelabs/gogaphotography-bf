import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/app/components/app/AppShell";
import { OverviewChat } from "./_components/OverviewChat";
import { translate } from "@/app/lib/i18n/dict";
import { getServerLocale } from "@/app/lib/i18n/server";
import type { TranslationKey } from "@/app/lib/i18n/dict";

export const metadata: Metadata = { title: "Studio" };
export const dynamic = "force-dynamic";

const STARTERS: TranslationKey[] = [
  "home.starter.followup",
  "home.starter.draft_email",
  "home.starter.tbilisi_4plus",
  "home.starter.pending_bookings",
];

const INBOX_LOCALPARTS = new Set([
  "info",
  "hello",
  "contact",
  "admin",
  "studio",
  "team",
  "support",
  "office",
  "no-reply",
  "noreply",
]);

function operatorFirstName(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) {
    const local = email.split("@")[0]!.toLowerCase();
    if (!INBOX_LOCALPARTS.has(local) && local.length > 1) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return "Goga";
}

export default async function HomePage() {
  const session = await auth();
  const firstName = operatorFirstName(
    session?.user?.name,
    session?.user?.email,
  );
  const locale = await getServerLocale();

  return (
    <AppShell
      breadcrumb={[{ label: translate(locale, "nav.home") }]}
      chatScope={{ level: "org", org: "goga" }}
      chatScopeLabel="GOGA Studio"
      hideChatToggle
    >
      <OverviewChat operatorFirstName={firstName} starters={STARTERS} />
    </AppShell>
  );
}
