// app/store/success/page.tsx
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { finalizeTbcPayment } from "@/app/lib/goga/finalize-tbc";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const sb = gogaAdmin();

  let order = orderId
    ? (
        await sb
          .from("store_orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle()
      ).data
    : null;

  // Safety net: if the callback hasn't landed yet but we have a payId, finalize now.
  if (order && order.status === "pending" && order.tbc_payment_id) {
    try {
      await finalizeTbcPayment(order.tbc_payment_id);
    } catch {}
    order = (
      await sb.from("store_orders").select("*").eq("id", orderId!).maybeSingle()
    ).data;
  }

  const downloads =
    order && order.status === "paid"
      ? ((
          await sb
            .from("store_downloads")
            .select("token, product_id")
            .eq("order_id", order.id)
        ).data ?? [])
      : [];
  const items = order
    ? ((
        await sb
          .from("store_order_items")
          .select("product_id, title_snapshot")
          .eq("order_id", order.id)
      ).data ?? [])
    : [];
  const titleByProduct = new Map(
    items.map((i) => [i.product_id, i.title_snapshot]),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {!order && <p>Order not found.</p>}
      {order && order.status !== "paid" && (
        <>
          <h1 className="text-2xl font-semibold">Payment processing…</h1>
          <p className="mt-2 text-neutral-600">
            If you completed payment, refresh this page in a moment. A download
            email is also on its way.
          </p>
        </>
      )}
      {order && order.status === "paid" && (
        <>
          <h1 className="text-2xl font-semibold">
            Thank you — here are your downloads
          </h1>
          <p className="mt-2 text-neutral-600">
            Links also sent to {order.buyer_email}. They expire in 7 days (5
            downloads each).
          </p>
          <ul className="mt-6 space-y-3">
            {downloads.map((d) => (
              <li
                key={d.token}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <span>{titleByProduct.get(d.product_id) ?? "Download"}</span>
                <a
                  className="rounded bg-black px-4 py-2 text-white"
                  href={`/api/store/download/${d.token}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
