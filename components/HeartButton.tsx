"use client";
import { useWishlist } from "./WishlistProvider";

export default function HeartButton({ id }: { id: string }) {
  const { has, toggle } = useWishlist();
  const on = has(id);
  return (
    <button
      type="button"
      aria-label={on ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() => toggle(id)}
      className={`w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center ${on ? "text-red-600" : ""}`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
