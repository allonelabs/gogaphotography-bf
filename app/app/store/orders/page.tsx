// app/app/store/orders/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  resendDownloadEmail,
  markRefunded,
} from "@/app/lib/goga/actions-store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store orders" };

function fmtGel(cents: number): string {
  return `${(cents / 100).toFixed(2)} ₾`;
}

export default async function OrdersPage() {
  const { data: orders } = await gogaAdmin()
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Store", href: "/app/store" },
        { label: "Orders" },
      ]}
      chatScope={{ level: "tool", tool: "store" }}
      chatScopeLabel="Store"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
          Store orders
        </h1>
        <table className="w-full text-[14px]">
          <thead>
            <tr className="text-left text-[var(--ink-500)]">
              <th className="py-2">Date</th>
              <th>Email</th>
              <th>Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-black/5 align-middle">
                <td className="py-2">
                  {new Date(o.created_at).toLocaleDateString()}
                </td>
                <td>{o.buyer_email}</td>
                <td>{fmtGel(o.total_cents)}</td>
                <td>{o.status}</td>
                <td className="space-x-3 text-right">
                  {o.status === "paid" && (
                    <>
                      <form
                        action={resendDownloadEmail.bind(null, o.id)}
                        className="inline"
                      >
                        <button className="text-xs underline">
                          resend email
                        </button>
                      </form>
                      <form
                        action={markRefunded.bind(null, o.id)}
                        className="inline"
                      >
                        <button className="text-xs text-red-600 underline">
                          mark refunded
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
