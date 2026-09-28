// app/app/store/orders/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  resendDownloadEmail,
  markRefunded,
} from "@/app/lib/goga/actions-store";
import { getServerTr } from "@/app/lib/i18n/server";
import type { StoreOrderStatus } from "@/app/lib/db/store-types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store orders" };

function fmtGel(cents: number): string {
  return `${(cents / 100).toFixed(2)} ₾`;
}

function statusLabel(
  status: StoreOrderStatus,
  tr: (en: string, ka: string) => string,
): string {
  switch (status) {
    case "pending":
      return tr("pending", "მოლოდინში");
    case "paid":
      return tr("paid", "გადახდილი");
    case "failed":
      return tr("failed", "წარუმატებელი");
    case "refunded":
      return tr("refunded", "დაბრუნებული");
    default:
      return status;
  }
}

export default async function OrdersPage() {
  const tr = await getServerTr();
  const { data: orders } = await gogaAdmin()
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Catalog", "კატალოგი") },
        { label: tr("Store", "მაღაზია"), href: "/admin/store" },
        { label: tr("Orders", "შეკვეთები") },
      ]}
      chatScope={{ level: "tool", tool: "store" }}
      chatScopeLabel={tr("Store", "მაღაზია")}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
          {tr("Store orders", "მაღაზიის შეკვეთები")}
        </h1>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[var(--ink-500)]">
              <th className="py-2">{tr("Date", "თარიღი")}</th>
              <th>{tr("Email", "ელფოსტა")}</th>
              <th>{tr("Total", "ჯამი")}</th>
              <th>{tr("Status", "სტატუსი")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-black/5 align-middle">
                <td className="py-2">
                  {new Date(o.created_at).toLocaleDateString(
                    tr("en-US", "ka-GE"),
                  )}
                </td>
                <td>{o.buyer_email}</td>
                <td>{fmtGel(o.total_cents)}</td>
                <td>{statusLabel(o.status, tr)}</td>
                <td className="space-x-3 text-right">
                  {o.status === "paid" && (
                    <>
                      <form
                        action={resendDownloadEmail.bind(null, o.id)}
                        className="inline"
                      >
                        <button className="text-xs underline">
                          {tr("resend email", "ელფოსტის ხელახლა გაგზავნა")}
                        </button>
                      </form>
                      <form
                        action={markRefunded.bind(null, o.id)}
                        className="inline"
                      >
                        <button className="text-xs text-red-600 underline">
                          {tr("mark refunded", "დაბრუნებულად მონიშვნა")}
                        </button>
                      </form>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
