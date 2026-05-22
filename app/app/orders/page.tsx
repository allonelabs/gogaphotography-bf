import { AppShell } from "@/app/components/app/AppShell";
import { OrdersTable } from "./_table";
import { headers } from "next/headers";
import { getServerT } from "@/app/lib/i18n/server";

export default async function OrdersPage() {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3003";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/orders?pageSize=50`, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });
  const j = await res.json();
  const t = await getServerT();

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.orders") },
      ]}
      chatScope={{ level: "tool", tool: "orders" }}
      chatScopeLabel={t("nav.orders")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
          {t("orders.title")}
        </h1>
        <OrdersTable
          initialData={{ data: j.data ?? [], total: j.total ?? 0 }}
        />
      </div>
    </AppShell>
  );
}
