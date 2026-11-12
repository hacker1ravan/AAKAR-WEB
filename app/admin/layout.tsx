import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminAny } from "@/lib/requireAdmin";
import { maybeExpireStaleOrders } from "@/lib/expiry";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

const links = [
  ["Dashboard", "/admin"],
  ["Sales", "/admin/sales"],
  ["Products", "/admin/products"],
  ["Categories", "/admin/categories"],
  ["Low stock", "/admin/low-stock"],
  ["Orders", "/admin/orders"],
  ["Customers", "/admin/customers"],
  ["Returns", "/admin/returns"],
  ["Coupons", "/admin/coupons"],
  ["Banners", "/admin/banners"],
  ["Reviews", "/admin/reviews"],
  ["Pages", "/admin/pages"],
  ["Settings", "/admin/settings"],
  ["Activity", "/admin/activity"],
  ["Security", "/admin/security"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // second check behind the middleware: only a logged-in admin sees any admin page
  if (!(await requireAdminAny())) redirect("/login?next=/admin");
  await maybeExpireStaleOrders();
  const { lowStockThreshold: t } = await getSettings();
  const low = await prisma.variant.count({ where: { stock: { lte: t } } });

  return (
    <div className="min-h-screen">
      <nav className="flex gap-4 overflow-x-auto border-b p-3 text-sm print:hidden">
        {links.map(([title, href]) => (
          <Link key={href} href={href} className="whitespace-nowrap">
            {title}
            {href === "/admin/low-stock" && low > 0 && (
              <span className="ml-1 bg-red-600 text-white text-xs rounded-full px-1.5">{low}</span>
            )}
          </Link>
        ))}
        <Link href="/" className="ml-auto whitespace-nowrap">View store</Link>
      </nav>
      {children}
    </div>
  );
}
