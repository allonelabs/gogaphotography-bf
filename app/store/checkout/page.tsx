// app/store/checkout/page.tsx
"use client";
import { useState } from "react";
import { CartProvider, useCart, formatGel } from "../_cart";

function CheckoutInner() {
  const { items, remove, totalCents, clear } = useCart();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((i) => ({ productId: i.productId })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      clear();
      window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (items.length === 0)
    return (
      <p className="mx-auto max-w-2xl px-6 py-12 text-neutral-500">
        Your cart is empty.
      </p>
    );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
      <ul className="divide-y rounded-lg border">
        {items.map((i) => (
          <li
            key={i.productId}
            className="flex items-center justify-between px-4 py-3"
          >
            <span>{i.title}</span>
            <span className="flex items-center gap-3">
              {formatGel(i.priceCents)}
              <button
                onClick={() => remove(i.productId)}
                className="text-sm text-neutral-400 hover:text-red-600"
              >
                remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between text-lg font-medium">
        <span>Total</span>
        <span>{formatGel(totalCents)}</span>
      </div>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-6 w-full rounded-md border px-3 py-2"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={pay}
        disabled={loading || !email}
        className="mt-4 w-full rounded-md bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Pay with TBC"}
      </button>
      <p className="mt-3 text-xs text-neutral-400">
        Download links will be emailed to you and shown on the next page.
      </p>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <CartProvider>
      <CheckoutInner />
    </CartProvider>
  );
}
