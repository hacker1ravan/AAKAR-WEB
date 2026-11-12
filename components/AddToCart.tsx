"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "./CartProvider";

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
  const chip = (on: boolean, off = false) =>
    `border rounded px-3 py-1 text-sm ${on ? "bg-black text-white" : ""} ${off ? "opacity-40 line-through" : ""}`;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm mb-1">Colour: {color}</p>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => (
            <button key={c} type="button" className={chip(c === color)}
              onClick={() => { setColor(c); setSize(""); setAdded(false); }}>{c}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm mb-1">Size</p>
        <div className="flex gap-2 flex-wrap">
          {options.map((v) => (
            <button key={v.id} type="button" disabled={v.stock < 1} className={chip(v.size === size, v.stock < 1)}
              onClick={() => { setSize(v.size); setAdded(false); }}>{v.size}</button>
          ))}
        </div>
        {variant && variant.stock <= 5 && <p className="text-xs text-red-600 mt-1">Only {variant.stock} left</p>}
      </div>
      <button
        disabled={!variant}
        className="w-full bg-[var(--primary)] text-[var(--secondary)] p-3 rounded disabled:opacity-40"
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
      </button>
      {added && <p className="text-sm">Added! <Link href="/cart" className="underline">View cart</Link></p>}
    </div>
  );
}
