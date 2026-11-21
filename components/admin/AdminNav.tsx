"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { title: string; href: string; badge?: number };
type Group = { label: string; items: Item[] };

export default function AdminNav({ lowStock }: { lowStock: number }) {
  const path = usePathname();

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

  return (
    <aside className="admin-sidebar print:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-[var(--line)]">
        <Link href="/admin" className="font-serif text-lg font-semibold tracking-tight">Admin</Link>
        <Link href="/" className="btn btn-outline btn-sm">View store</Link>
      </div>
      <nav className="py-2 lg:pb-8 flex gap-x-1 overflow-x-auto lg:block [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((g) => (
          <div key={g.label} className="shrink-0 lg:shrink">
            <p className="admin-group-label hidden lg:block">{g.label}</p>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} data-active={activeHref === i.href} className="admin-nav-link">
                {i.title}
                {i.badge ? <span className="admin-count-badge">{i.badge}</span> : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
