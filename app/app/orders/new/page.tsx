import { AppShell } from "@/app/components/app/AppShell";
import { NewOrderForm } from "./_form";
import { getServerT } from "@/app/lib/i18n/server";

export default async function NewOrderPage() {
  const t = await getServerT();
  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.orders"), href: "/app/orders" },
        { label: t("crumb.new") },
      ]}
      chatScope={{ level: "tool", tool: "orders" }}
      chatScopeLabel={t("nav.orders")}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
          {t("orders.new_title")}
        </h1>
        <p className="mb-6 text-[13px] text-[var(--ink-500)]">
          {t("orders.new_intro")}
        </p>
        <NewOrderForm />
      </div>
    </AppShell>
  );
}
