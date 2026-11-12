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
      <Link href="/cart">Cart ({count})</Link>
      {user ? (
        <>
          <Link href="/wishlist">Wishlist</Link>
          <Link href="/orders">Orders</Link>
          <Link href="/account">Account</Link>
          {user.role === "admin" && <Link href="/admin">Admin</Link>}
          <button onClick={() => signOut({ callbackUrl: "/" })}>Logout</button>
        </>
      ) : (
        <Link href="/login">Login</Link>
      )}
    </>
  );
}
