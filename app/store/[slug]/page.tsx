// app/store/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/app/lib/goga/store-products";
import { CartProvider, formatGel } from "../_cart";
import { AddToCart } from "../_add-to-cart";

export const dynamic = "force-dynamic";

function publicUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  if (!p) notFound();

  return (
    <CartProvider>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
            {publicUrl(p.cover_image_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUrl(p.cover_image_path)!}
                alt={p.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-400">
              {p.type}
            </span>
            <h1 className="mt-1 text-3xl font-semibold">{p.title}</h1>
            <p className="mt-2 text-xl text-neutral-700">
              {formatGel(p.price_cents)}
            </p>
            {p.description && (
              <p className="mt-4 whitespace-pre-wrap text-neutral-600">
                {p.description}
              </p>
            )}
            {p.license_terms && (
              <p className="mt-4 text-sm text-neutral-500">
                <strong>License:</strong> {p.license_terms}
              </p>
            )}
            <div className="mt-6">
              <AddToCart
                item={{
                  productId: p.id,
                  slug: p.slug,
                  title: p.title,
                  priceCents: p.price_cents,
                }}
              />
            </div>
            <a
              href="/store/checkout"
              className="mt-4 block text-sm text-neutral-500 underline"
            >
              Go to checkout →
            </a>
          </div>
        </div>
      </main>
    </CartProvider>
  );
}
