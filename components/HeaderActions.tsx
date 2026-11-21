"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

export default function HeaderActions() {
  const { data } = useSession();
  const { count } = useCart();
  const user = data?.user as any;
  return (
    <>
      <Link href="/cart" className="link-underline inline-flex items-center gap-1.5">
        Cart
        <span
          className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold leading-none ${
            count > 0 ? "bg-[var(--accent)] text-white" : "bg-[var(--surface-2)] text-[var(--muted)] border border-[var(--line)]"
          }`}
        >
          {count}
        </span>
      </Link>
      {user ? (
        <>
          <Link href="/wishlist" className="link-underline">Wishlist</Link>
          <Link href="/orders" className="link-underline">Orders</Link>
          <Link href="/account" className="link-underline">Account</Link>
          {user.role === "admin" && <Link href="/admin" className="link-underline">Admin</Link>}
          <button onClick={() => signOut({ callbackUrl: "/" })} className="link-underline cursor-pointer">
            Logout
          </button>
        </>
      ) : (
        <Link href="/login" className="link-underline">Login</Link>
      )}
    </>
  );
}
