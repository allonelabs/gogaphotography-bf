import { AppShell } from "@/app/components/app/AppShell";
import { requirePermission } from "@/app/lib/auth/permissions";
import { getServerT } from "@/app/lib/i18n/server";
import { TRIGGERS, ACTIONS } from "@/app/lib/automation/catalog";
import { NewAutomationForm } from "./_form";

export default async function NewAutomationPage() {
  await requirePermission("automations.write");
  const t = await getServerT();

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.automations"), href: "/app/automations" },
        { label: t("automation.new") },
      ]}
      chatScope={{ level: "tool", tool: "automations" }}
      chatScopeLabel={t("nav.automations")}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-1 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)]">
          {t("automation.new")}
        </h1>
        <p className="mb-6 text-[13px] text-[var(--ink-500)]">
          {t("automation.new.intro")}
        </p>
        <NewAutomationForm
          triggers={TRIGGERS.map((tr) => ({
            event: tr.event,
            label: tr.label,
          }))}
          actions={ACTIONS.map((a) => ({
            kind: a.kind,
            label: a.label,
            required: a.required,
          }))}
        />
      </div>
    </AppShell>
  );
}
