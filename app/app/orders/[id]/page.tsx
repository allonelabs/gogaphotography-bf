import { AppShell } from "@/app/components/app/AppShell";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { OrderDetailView } from "./_detail-view";
import { getServerT } from "@/app/lib/i18n/server";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3003";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const res = await fetch(`${proto}://${host}/api/orders/${id}`, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });
  const j = await res.json();
  if (!j.ok) notFound();
  const t = await getServerT();

  const clientName =
    [j.data.client_first_name, j.data.client_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || "—";
  const title = j.data.order_number
    ? t("orders.title_with_number", { n: j.data.order_number })
    : t("orders.title_with_id", { id: j.data.id });

  return (
    <AppShell
      breadcrumb={[
        { label: t("nav.section.operations") },
        { label: t("nav.orders"), href: "/app/orders" },
        { label: title },
      ]}
      chatScope={{ level: "tool", tool: "orders" }}
      chatScopeLabel={t("nav.orders")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-1 text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
          {title}
        </h1>
        <p className="mb-6 text-[13px] text-[var(--ink-500)]">
          {clientName} ·{" "}
          {j.data.order_date ? String(j.data.order_date).slice(0, 10) : "—"} ·{" "}
          {j.data.c_semblance ?? t("orders.no_status")} ·{" "}
          {j.data.all_sell_price != null
            ? `${Number(j.data.all_sell_price).toLocaleString()} ${
                j.data.cm_currency ?? ""
              }`
            : "—"}
        </p>
        <OrderDetailView order={j.data} kind="order" />
      </div>
    </AppShell>
  );
}
