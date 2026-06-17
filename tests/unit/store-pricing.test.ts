// tests/store-pricing.test.ts
import { describe, it, expect } from "vitest";
import { recomputeCart, type CartLine } from "@/app/lib/goga/store-pricing";
import type { StoreProductRow } from "@/app/lib/db/store-types";

const products: StoreProductRow[] = [
  {
    id: "a",
    type: "preset",
    title: "Warm Pack",
    slug: "warm",
    description: null,
    price_cents: 4900,
    currency: "GEL",
    cover_image_path: null,
    preview_image_paths: [],
    file_path: "f/a.zip",
    file_size_bytes: 1,
    license_terms: null,
    metadata: {},
    published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "b",
    type: "album",
    title: "Tbilisi",
    slug: "tbilisi",
    description: null,
    price_cents: 12000,
    currency: "GEL",
    cover_image_path: null,
    preview_image_paths: [],
    file_path: "f/b.zip",
    file_size_bytes: 1,
    license_terms: null,
    metadata: {},
    published: true,
    created_at: "",
    updated_at: "",
  },
];

describe("recomputeCart", () => {
  it("sums prices from DB, ignoring duplicate ids and client prices", () => {
    const cart: CartLine[] = [
      { productId: "a" },
      { productId: "b" },
      { productId: "a" },
    ];
    const r = recomputeCart(cart, products);
    expect(r.items.map((i) => i.product_id)).toEqual(["a", "b"]);
    expect(r.totalCents).toBe(16900);
    expect(r.currency).toBe("GEL");
  });

  it("throws when a cart product is missing or unpublished", () => {
    const unpub = { ...products[0], published: false };
    expect(() =>
      recomputeCart([{ productId: "a" }], [unpub, products[1]]),
    ).toThrow(/unavailable/i);
    expect(() => recomputeCart([{ productId: "zzz" }], products)).toThrow(
      /unavailable/i,
    );
  });

  it("throws on an empty cart", () => {
    expect(() => recomputeCart([], products)).toThrow(/empty/i);
  });
});
