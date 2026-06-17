// app/store/_add-to-cart.tsx
"use client";
import { useCart, type CartItem } from "./_cart";

export function AddToCart({ item }: { item: CartItem }) {
  const { add, items } = useCart();
  const inCart = items.some((c) => c.productId === item.productId);
  return (
    <button
      onClick={() => add(item)}
      disabled={inCart}
      className="rounded-md bg-black px-5 py-2.5 text-white disabled:opacity-50"
    >
      {inCart ? "In cart" : "Add to cart"}
    </button>
  );
}
