// app/store/_cart.tsx
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
}
interface CartCtx {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalCents: number;
}
const Ctx = createContext<CartCtx | null>(null);
const KEY = "goga.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = (i: CartItem) =>
    setItems((cur) =>
      cur.some((c) => c.productId === i.productId) ? cur : [...cur, i],
    );
  const remove = (productId: string) =>
    setItems((cur) => cur.filter((c) => c.productId !== productId));
  const clear = () => setItems([]);
  const totalCents = items.reduce((s, i) => s + i.priceCents, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, totalCents }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
