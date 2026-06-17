// app/app/store/page.tsx
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listAllProducts } from "@/app/lib/goga/store-products";
import { createStoreProduct } from "@/app/lib/goga/actions-store";
import { ProductForm } from "./product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Store" };

function fmtGel(cents: number): string {
  return `${(cents / 100).toFixed(2)} ₾`;
}

export default async function AdminStorePage() {
  const products = await listAllProducts();
  return (
    <AppShell
      breadcrumb={[{ label: "Catalog" }, { label: "Store" }]}
      chatScope={{ level: "tool", tool: "store" }}
      chatScopeLabel="Store"
    >
      <div className="mx-auto max-w-7xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <header className="mb-5 flex items-baseline justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.022em] text-[var(--ink-900)] sm:text-2xl">
                Store products
              </h1>
              <p className="mt-1 text-[12px] uppercase tracking-[0.22em] text-[var(--ink-500)]">
                {products.length} total
              </p>
            </div>
            <Link
              href="/app/store/orders"
              className="text-[12px] uppercase tracking-[0.18em] text-[var(--ink-500)] underline"
            >
              View orders →
            </Link>
          </header>

          {products.length === 0 ? (
            <div className="rounded-2xl bg-white px-8 py-10 text-center ring-1 ring-black/5">
              <p className="text-[14px] text-[var(--ink-500)]">
                No products yet — create your first album or preset below.
              </p>
            </div>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-[var(--ink-500)]">
                  <th className="py-2">Title</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Published</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-t border-black/5">
                    <td className="py-2">{p.title}</td>
                    <td>{p.type}</td>
                    <td>{fmtGel(p.price_cents)}</td>
                    <td>{p.published ? "✓" : "—"}</td>
                    <td className="text-right">
                      <Link href={`/app/store/${p.id}`} className="underline">
                        edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold text-[var(--ink-900)]">
            New product
          </h2>
          <ProductForm action={createStoreProduct} />
        </section>
      </div>
    </AppShell>
  );
}
