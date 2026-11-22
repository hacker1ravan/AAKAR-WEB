"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { title: string; href: string; badge?: number };
type Group = { label: string; items: Item[] };

export default function AdminNav({ lowStock }: { lowStock: number }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  const groups: Group[] = [
    { label: "Overview", items: [
      { title: "Dashboard", href: "/admin" },
      { title: "Sales", href: "/admin/sales" },
    ] },
    { label: "Catalog", items: [
      { title: "Products", href: "/admin/products" },
      { title: "Categories", href: "/admin/categories" },
      { title: "Low stock", href: "/admin/low-stock", badge: lowStock },
    ] },
    { label: "Orders", items: [
      { title: "Orders", href: "/admin/orders" },
      { title: "Returns", href: "/admin/returns" },
      { title: "Customers", href: "/admin/customers" },
    ] },
    { label: "Marketing", items: [
      { title: "Coupons", href: "/admin/coupons" },
      { title: "Banners", href: "/admin/banners" },
      { title: "Reviews", href: "/admin/reviews" },
    ] },
    { label: "Content", items: [
      { title: "Pages", href: "/admin/pages" },
    ] },
    { label: "System", items: [
      { title: "Settings", href: "/admin/settings" },
      { title: "Activity", href: "/admin/activity" },
      { title: "Security", href: "/admin/security" },
    ] },
  ];

  // Longest matching href wins so e.g. /admin/products isn't shadowed by /admin.
  const activeHref = groups
    .flatMap((g) => g.items.map((i) => i.href))
    .filter((h) => (h === "/admin" ? path === "/admin" : path === h || path.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];

  const activeTitle =
    groups.flatMap((g) => g.items).find((i) => i.href === activeHref)?.title ?? "Admin";

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [path]);

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

  // Shared grouped nav markup, reused by the desktop sidebar and the mobile drawer.
  const nav = (
    <>
      {groups.map((g) => (
        <div key={g.label}>
          <p className="admin-group-label">{g.label}</p>
          {g.items.map((i) => (
            <Link key={i.href} href={i.href} data-active={activeHref === i.href} className="admin-nav-link">
              {i.title}
              {i.badge ? <span className="admin-count-badge">{i.badge}</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop sidebar (lg and up) — unchanged sticky grid column. */}
      <aside className="admin-sidebar hidden lg:block print:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-[var(--line)]">
          <Link href="/admin" className="font-serif text-lg font-semibold tracking-tight">Admin</Link>
          <Link href="/" className="btn btn-outline btn-sm">View store</Link>
        </div>
        <nav className="py-2 lg:pb-8">{nav}</nav>
      </aside>

      {/* Mobile top bar (below lg) — hamburger opens the drawer. */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 print:hidden">
        <button
          type="button"
          aria-label="Open admin menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-sm)] text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <span className="font-serif text-base font-semibold tracking-tight truncate">{activeTitle}</span>
        <Link href="/" className="btn btn-outline btn-sm shrink-0">View store</Link>
      </div>

      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-[rgba(28,25,23,0.45)] backdrop-blur-[1px] transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Mobile drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin menu"
        className={`lg:hidden fixed left-0 top-0 z-50 flex h-full w-[82%] max-w-xs flex-col bg-[var(--surface)] shadow-[var(--shadow-lg)] transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3.5">
          <Link href="/admin" className="font-serif text-lg font-semibold tracking-tight">Admin</Link>
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-sm)] text-[var(--ink)] transition hover:bg-[var(--surface-2)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="admin-nav-mobile flex-1 overflow-y-auto py-2 pb-4">{nav}</nav>
      </aside>
    </>
  );
}
