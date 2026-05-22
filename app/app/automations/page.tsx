import { AppShell } from "@/app/components/app/AppShell";
import { headers } from "next/headers";
import Link from "next/link";
import { requirePermission } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { AutomationsTable } from "./_table";

interface AutomationRuleRow {
  id: number;
  name: string;
  description: string | null;
  trigger_event: string;
  enabled: boolean;
  created_by: string | null;
  created_at: string;
  actions: Array<Record<string, unknown>>;
}

export default async function AutomationsPage() {
  await requirePermission("automations.read");

  const h = await headers();
  const host = h.get("host") ?? "localhost:3003";
  const proto = h.get("x-forwarded-proto") ?? "http";
  let rules: AutomationRuleRow[] = [];
  try {
    const res = await fetch(`${proto}://${host}/api/automations`, {
      cache: "no-store",
      headers: { cookie: h.get("cookie") ?? "" },
    });
    const j = await res.json();
    if (j?.ok && Array.isArray(j.data)) rules = j.data as AutomationRuleRow[];
  } catch {
    /* swallow */
  }
  const t = await getServerT();

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.automations") },
      ]}
      chatScope={{ level: "tool", tool: "automations" }}
      chatScopeLabel={t("nav.automations")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-1 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
              {t("automation.title")}
            </h1>
            <p className="text-[13px] text-[var(--ink-500)]">
              {t("automation.intro")}
            </p>
          </div>
          <Link
            href="/app/automations/new"
            className="rounded-[var(--radius-xs)] bg-[var(--ink-900)] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[var(--ink-700)]"
          >
            {t("automation.new")}
          </Link>
        </div>
        <AutomationsTable initialRules={rules} />
      </div>
    </AppShell>
  );
}
