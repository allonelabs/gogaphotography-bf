// app/app/store/[id]/page.tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { getProductById } from "@/app/lib/goga/store-products";
import {
  updateStoreProduct,
  deleteStoreProduct,
} from "@/app/lib/goga/actions-store";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const update = updateStoreProduct.bind(null, id);
  const del = deleteStoreProduct.bind(null, id);

  return (
    <AppShell
      breadcrumb={[
        { label: "Catalog" },
        { label: "Store", href: "/app/store" },
        { label: product.title },
      ]}
      chatScope={{ level: "tool", tool: "store" }}
      chatScopeLabel="Store"
    >
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-semibold text-[var(--ink-900)]">
          Edit: {product.title}
        </h1>
        <ProductForm action={update} product={product} />
        <form action={del}>
          <button className="text-sm text-red-600 underline">
            Delete product
          </button>
        </form>
      </div>
    </AppShell>
  );
}
