// app/lib/goga/store-pricing.ts
import type { StoreProductRow } from "@/app/lib/db/store-types";

export interface CartLine {
  productId: string;
}

export interface PricedItem {
  product_id: string;
  title_snapshot: string;
  price_cents_snapshot: number;
}

export interface PricedCart {
  items: PricedItem[];
  totalCents: number;
  currency: string;
}

/**
 * Recompute a cart from authoritative DB rows. De-duplicates by product id
 * (digital goods — one copy per buyer), rejects missing/unpublished items,
 * and ignores any client-supplied prices entirely.
 */
export function recomputeCart(
  cart: CartLine[],
  products: StoreProductRow[],
): PricedCart {
  const ids = Array.from(new Set(cart.map((l) => l.productId)));
  if (ids.length === 0) throw new Error("Cart is empty");
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: PricedItem[] = ids.map((id) => {
    const p = byId.get(id);
    if (!p || !p.published) throw new Error(`Product unavailable: ${id}`);
    return {
      product_id: p.id,
      title_snapshot: p.title,
      price_cents_snapshot: p.price_cents,
    };
  });
  const totalCents = items.reduce((s, i) => s + i.price_cents_snapshot, 0);
  const currency = products.find((p) => p.id === ids[0])?.currency ?? "GEL";
  return { items, totalCents, currency };
}
