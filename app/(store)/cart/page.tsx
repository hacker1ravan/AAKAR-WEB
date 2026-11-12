"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { inr } from "@/lib/format";
import Photo from "@/components/Photo";

export default function CartPage() {
  const { items, setQty, remove, total, ready } = useCart();
  if (!ready) return <p className="p-6">Loading...</p>;
  if (!items.length)
    return (
      <main className="p-6 text-center space-y-3">
        <p>Your cart is empty.</p>
        <Link href="/products" className="underline">Continue shopping</Link>
      </main>
    );

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-bold">Cart</h1>
      {items.map((i) => (
        <div key={i.variantId} className="flex gap-3 border rounded p-2">
          <Photo src={i.image} alt="" width={160} className="w-20 h-24 object-cover rounded" />
          <div className="flex-1 text-sm">
            <Link href={`/products/${i.productId}`} className="font-medium">{i.name}</Link>
            <p>{i.color} · {i.size}</p>
            <p>{inr(i.price)}</p>
            <div className="flex items-center gap-2 mt-1">
              <button className="border px-2" aria-label="Decrease quantity" onClick={() => setQty(i.variantId, i.qty - 1)}>-</button>
              <span>{i.qty}</span>
              <button className="border px-2 disabled:opacity-40" aria-label="Increase quantity" disabled={i.qty >= i.max}
                onClick={() => setQty(i.variantId, i.qty + 1)}>+</button>
              <button className="underline ml-auto" onClick={() => remove(i.variantId)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between font-semibold text-lg"><span>Total</span><span>{inr(total)}</span></div>
      <p className="text-xs">Shipping and coupons are applied at checkout.</p>
      <Link href="/checkout" className="block text-center bg-[var(--primary)] text-[var(--secondary)] p-3 rounded">
        Checkout
      </Link>
    </main>
  );
}
