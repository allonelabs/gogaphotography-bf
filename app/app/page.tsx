import type { Metadata } from "next";
import { auth } from "@/auth";
import { AppShell } from "@/app/components/app/AppShell";
import { OverviewChat } from "./_components/OverviewChat";
import { translate } from "@/app/lib/i18n/dict";
import { getServerLocale } from "@/app/lib/i18n/server";
import type { TranslationKey } from "@/app/lib/i18n/dict";

export const metadata: Metadata = {
  title: "Home",
};

export const dynamic = "force-dynamic";

const STARTERS: TranslationKey[] = [
  "home.starter.followup",
  "home.starter.draft_email",
  "home.starter.tbilisi_4plus",
  "home.starter.pending_bookings",
];

function firstNameFromSession(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name) return name.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

export default async function HomePage() {
  const session = await auth();
  const firstName = firstNameFromSession(
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
