"use client";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

// Shared look for a header utility action: icon + label in a soft hover pill.
const action =
  "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[var(--ink-soft)] transition hover:bg-[var(--surface-2)] hover:text-[var(--ink)]";

const svg = {
  width: 17,
  height: 17,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const Bag = () => (
  <svg {...svg}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
);
const Heart = () => (
  <svg {...svg}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
);
const Box = () => (
  <svg {...svg}><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></svg>
);
const User = () => (
  <svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
const Shield = () => (
  <svg {...svg}><path d="M12 2 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6Z" /></svg>
);
const LogOut = () => (
  <svg {...svg}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
);
const LogIn = () => (
  <svg {...svg}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>
);

export default function HeaderActions() {
  const { data } = useSession();
  const { count } = useCart();
  const user = data?.user as any;
  return (
    <>
      <Link href="/cart" className={action} aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
        <Bag />
        <span>Cart</span>
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
          <Link href="/wishlist" className={action}><Heart /><span>Wishlist</span></Link>
          <Link href="/orders" className={action}><Box /><span>Orders</span></Link>
          <Link href="/account" className={action}><User /><span>Account</span></Link>
          {user.role === "admin" && <Link href="/admin" className={action}><Shield /><span>Admin</span></Link>}
          <button onClick={() => signOut({ callbackUrl: "/" })} className={`${action} cursor-pointer`}>
            <LogOut /><span>Logout</span>
          </button>
        </>
      ) : (
        <Link href="/login" className={action}><LogIn /><span>Login</span></Link>
      )}
    </>
  );
}
