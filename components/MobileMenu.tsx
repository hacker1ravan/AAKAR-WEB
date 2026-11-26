"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useCart } from "./CartProvider";

/**
 * Storefront mobile navigation: a hamburger button (shown only below md)
 * that opens a right-side slide-in drawer holding the utility/account links
 * which otherwise wrap into a pile on small screens. Presentational only.
 *
 * The overlay + drawer are portalled to <body> so they are not trapped by the
 * header's `backdrop-filter`, which would otherwise act as the containing block
 * for these `position: fixed` elements and clip them to the header's height.
 */

const svg = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const Shop = () => (<svg {...svg}><path d="M3 9h18M3 9l1.5-5h15L21 9M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" /></svg>);
const Bag = () => (<svg {...svg}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>);
const Heart = () => (<svg {...svg}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>);
const Box = () => (<svg {...svg}><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></svg>);
const User = () => (<svg {...svg}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>);
const Shield = () => (<svg {...svg}><path d="M12 2 4 6v6c0 5 3.4 8 8 10 4.6-2 8-5 8-10V6Z" /></svg>);
const LogOut = () => (<svg {...svg}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>);
const LogIn = () => (<svg {...svg}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></svg>);

export default function MobileMenu() {
  const { data } = useSession();
  const { count } = useCart();
  const user = data?.user as any;
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portals need a DOM target; only render them after mount (client-side).
  useEffect(() => setMounted(true), []);

  // Close on Escape and lock body scroll while the drawer is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  const linkCls =
    "flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-[0.95rem] text-[var(--ink)] transition hover:bg-[var(--surface-2)]";
  const label = "flex items-center gap-2.5 text-[var(--ink-soft)]";

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {mounted &&
        createPortal(
          <>
            {/* Overlay */}
            <div
              onClick={close}
              aria-hidden="true"
              className={`fixed inset-0 z-40 bg-[rgba(28,25,23,0.45)] backdrop-blur-[1px] transition-opacity duration-200 ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* Drawer */}
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className={`fixed right-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)] transition-transform duration-200 ease-out ${
                open ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
                <span className="eyebrow">Menu</span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={close}
                  className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-2">
                <Link href="/products" onClick={close} className={linkCls}><span className={label}><Shop />Shop</span></Link>
                <Link href="/cart" onClick={close} className={linkCls}>
                  <span className={label}><Bag />Cart</span>
                  <span
                    className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-semibold leading-none ${
                      count > 0
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--line)] bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {count}
                  </span>
                </Link>
                {user ? (
                  <>
                    <Link href="/wishlist" onClick={close} className={linkCls}><span className={label}><Heart />Wishlist</span></Link>
                    <Link href="/orders" onClick={close} className={linkCls}><span className={label}><Box />Orders</span></Link>
                    <Link href="/account" onClick={close} className={linkCls}><span className={label}><User />Account</span></Link>
                    {user.role === "admin" && (
                      <Link href="/admin" onClick={close} className={linkCls}><span className={label}><Shield />Admin</span></Link>
                    )}
                    <button
                      type="button"
                      onClick={() => { close(); signOut({ callbackUrl: "/" }); }}
                      className={`${linkCls} w-full cursor-pointer text-left`}
                    >
                      <span className={label}><LogOut />Logout</span>
                    </button>
                  </>
                ) : (
                  <Link href="/login" onClick={close} className={linkCls}><span className={label}><LogIn />Login</span></Link>
                )}
              </nav>
            </aside>
          </>,
          document.body,
        )}
    </div>
  );
}
