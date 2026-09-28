// app/app/store/[id]/page.tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { getProductById } from "@/app/lib/goga/store-products";
import {
  updateStoreProduct,
  deleteStoreProduct,
} from "@/app/lib/goga/actions-store";
import { ProductForm } from "../product-form";
import { getServerTr } from "@/app/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tr = await getServerTr();
  const product = await getProductById(id);
  if (!product) notFound();

  const update = updateStoreProduct.bind(null, id);
  const del = deleteStoreProduct.bind(null, id);

  return (
    <AppShell
      breadcrumb={[
        { label: tr("Catalog", "კატალოგი") },
        { label: tr("Store", "მაღაზია"), href: "/admin/store" },
        { label: product.title },
      ]}
      chatScope={{ level: "tool", tool: "store" }}
      chatScopeLabel={tr("Store", "მაღაზია")}
    >
      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-xl font-semibold text-[var(--ink-900)]">
          {tr("Edit", "რედაქტირება")}: {product.title}
        </h1>
        <ProductForm action={update} product={product} />
        <form action={del}>
          <button className="text-sm text-red-600 underline">
            {tr("Delete product", "პროდუქტის წაშლა")}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
