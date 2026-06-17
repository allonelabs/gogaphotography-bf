// app/store/page.tsx
import Link from "next/link";
import { listPublishedProducts } from "@/app/lib/goga/store-products";
import { CartProvider } from "./_cart";
import { formatGel } from "./_format";

export const dynamic = "force-dynamic";

function publicUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/projects/${path}`;
}

export default async function StorePage() {
  const products = await listPublishedProducts();
  return (
    <CartProvider>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold">Store</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/store/${p.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
                {publicUrl(p.cover_image_path) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicUrl(p.cover_image_path)!}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-medium">{p.title}</span>
                <span className="text-neutral-600">
                  {formatGel(p.price_cents)}
                </span>
              </div>
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                {p.type}
              </span>
            </Link>
          ))}
          {products.length === 0 && (
            <p className="text-neutral-500">No products yet.</p>
          )}
        </div>
      </main>
    </CartProvider>
  );
}
