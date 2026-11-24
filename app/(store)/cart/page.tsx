"use client";
import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { inr } from "@/lib/format";
import Photo from "@/components/Photo";
import { ButtonLink } from "@/components/ui/Button";

export default function CartPage() {
  const { items, setQty, remove, total, ready } = useCart();
  if (!ready) return <p className="p-6" role="status" aria-live="polite">Loading...</p>;
  if (!items.length)
    return (
      <main className="p-6 text-center space-y-3">
        <p className="text-[var(--ink-soft)]">Your cart is empty.</p>
        <ButtonLink href="/products" variant="dark">Continue shopping</ButtonLink>
      </main>
    );

  const qtyBtn = "grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] border border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--surface-2)] disabled:opacity-40";

  return (
    <main className="max-w-2xl mx-auto p-4 space-y-3">
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Cart</h1>
      {items.map((i) => (
        <div key={i.variantId} className="flex gap-3 surface p-3">
          <Photo src={i.image} alt="" width={160} className="w-20 h-24 object-cover rounded-[var(--radius-sm)]" />
          <div className="flex-1 text-sm">
            <Link href={`/products/${i.productId}`} className="font-medium hover:text-[var(--accent)] transition">{i.name}</Link>
            <p className="text-[var(--ink-soft)]">{i.color} · {i.size}</p>
            <p className="mt-0.5">{inr(i.price)}</p>
            <div className="flex items-center gap-2 mt-2">
              <button className={qtyBtn} aria-label="Decrease quantity" onClick={() => setQty(i.variantId, i.qty - 1)}>−</button>
              <span className="w-6 text-center tabular-nums">{i.qty}</span>
              <button className={qtyBtn} aria-label="Increase quantity" disabled={i.qty >= i.max}
                onClick={() => setQty(i.variantId, i.qty + 1)}>+</button>
              <button className="btn btn-link btn-sm ml-auto" onClick={() => remove(i.variantId)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
      <div className="flex justify-between font-semibold text-lg pt-2"><span>Total</span><span>{inr(total)}</span></div>
      <p className="text-xs text-[var(--muted)]">Shipping and coupons are applied at checkout.</p>
      <ButtonLink href="/checkout" variant="dark" size="lg" block>Checkout</ButtonLink>
    </main>
  );
}
