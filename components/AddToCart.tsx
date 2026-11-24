"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";
import Button from "./ui/Button";

type V = { id: string; size: string; color: string; stock: number };
type Props = { product: { id: string; name: string; price: number; image: string; variants: V[] } };

export default function AddToCart({ product }: Props) {
  const { add } = useCart();
  const colors = [...new Set(product.variants.map((v) => v.color))];
  const [color, setColor] = useState(colors[0] ?? "");
  const [size, setSize] = useState("");
  const [added, setAdded] = useState(false);

  const options = product.variants.filter((v) => v.color === color);
  const variant = options.find((v) => v.size === size);

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Colour">
        <p className="text-sm mb-1.5 text-[var(--ink-soft)]">Colour: <span className="font-medium text-[var(--ink)]">{color}</span></p>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => (
            <button key={c} type="button" className="chip" data-active={c === color} aria-pressed={c === color}
              onClick={() => { setColor(c); setSize(""); setAdded(false); }}>{c}</button>
          ))}
        </div>
      </div>
      <div role="group" aria-label="Size">
        <p className="text-sm mb-1.5 text-[var(--ink-soft)]">Size</p>
        <div className="flex gap-2 flex-wrap">
          {options.map((v) => (
            <button key={v.id} type="button" disabled={v.stock < 1} data-active={v.size === size} aria-pressed={v.size === size}
              className={`chip ${v.stock < 1 ? "opacity-40 line-through cursor-not-allowed" : ""}`}
              onClick={() => { setSize(v.size); setAdded(false); }}>{v.size}</button>
          ))}
        </div>
        {variant && variant.stock <= 5 && <p className="mt-1.5 text-xs font-medium text-[var(--danger)]">Only {variant.stock} left</p>}
      </div>
      <Button
        variant="dark"
        size="lg"
        block
        disabled={!variant}
        onClick={() => {
          if (!variant) return;
          add({
            variantId: variant.id, productId: product.id, name: product.name, image: product.image,
            size: variant.size, color: variant.color, price: product.price, max: variant.stock,
          });
          setAdded(true);
        }}
      >
        {variant ? "Add to cart" : "Select a size"}
      </Button>
      <p className="text-sm" role="status" aria-live="polite">
        {added && <>Added! <Link href="/cart" className="link-underline">View cart</Link></>}
      </p>
    </div>
  );
}
