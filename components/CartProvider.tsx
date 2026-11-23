"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/fetcher";

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
    let stored: CartItem[] = [];
    try { stored = JSON.parse(localStorage.getItem("cart") || "[]"); } catch {}
    setItems(stored);
    setReady(true);
    if (!stored.length) return;

    // Prices and stock are cached in the browser at add-time; refresh them from the server so
    // the cart reflects current price/availability. Charged totals are re-priced at checkout
    // regardless, so this is only to keep what the customer sees accurate.
    let live = true;
    const asked = new Set(stored.map((i) => i.variantId));
    api<{ items: { variantId: string; name: string; image: string; size: string; color: string; price: number; stock: number }[] }>(
      "/api/cart/validate", "POST", { variantIds: stored.map((i) => i.variantId) }
    )
      .then(({ items: fresh }) => {
        if (!live) return;
        const by = new Map(fresh.map((f) => [f.variantId, f]));
        setItems((cur) =>
          cur
            .map((i) => {
              const f = by.get(i.variantId);
              // A validated item the server did not return is gone or hidden: drop it.
              // An item we never asked about (added after mount) is left untouched.
              if (!f) return asked.has(i.variantId) ? null : i;
              if (f.stock < 1) return null;
              return { ...i, name: f.name, image: f.image, price: f.price, max: f.stock, qty: Math.min(i.qty, f.stock) };
            })
            .filter((i): i is CartItem => i !== null)
        );
      })
      .catch(() => {});
    return () => { live = false; };
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
