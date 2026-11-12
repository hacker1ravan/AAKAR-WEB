"use client";
import { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  variantId: string; productId: string; name: string; image: string;
  size: string; color: string; price: number; qty: number; max: number;
};
type Ctx = {
  items: CartItem[]; ready: boolean; count: number; total: number;
  add: (i: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (id: string, q: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const Cart = createContext<Ctx>(null as unknown as Ctx);
export const useCart = () => useContext(Cart);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem("cart") || "[]")); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem("cart", JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const add: Ctx["add"] = (i, qty = 1) =>
    setItems((p) =>
      p.some((x) => x.variantId === i.variantId)
        ? p.map((x) => (x.variantId === i.variantId ? { ...x, qty: Math.min(x.qty + qty, i.max) } : x))
        : [...p, { ...i, qty: Math.min(qty, i.max) }]
    );
  const remove = (id: string) => setItems((p) => p.filter((x) => x.variantId !== id));
  const setQty = (id: string, q: number) =>
    q < 1 ? remove(id) : setItems((p) => p.map((x) => (x.variantId === id ? { ...x, qty: Math.min(q, x.max) } : x)));

  return (
    <Cart.Provider value={{
      items, ready, add, setQty, remove, clear: () => setItems([]),
      count: items.reduce((n, i) => n + i.qty, 0),
      total: items.reduce((n, i) => n + i.qty * i.price, 0),
    }}>
      {children}
    </Cart.Provider>
  );
}
