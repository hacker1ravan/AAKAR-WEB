import { redirect } from "next/navigation";
import { requireAdminAny } from "@/lib/requireAdmin";
import { maybeExpireStaleOrders } from "@/lib/expiry";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import AdminNav from "@/components/admin/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // second check behind the middleware: only a logged-in admin sees any admin page
  if (!(await requireAdminAny())) redirect("/login?next=/admin");
  await maybeExpireStaleOrders();
  const { lowStockThreshold: t } = await getSettings();
  const low = await prisma.variant.count({ where: { stock: { lte: t } } });

  return (
    <div className="admin-shell">
      <AdminNav lowStock={low} />
      <main className="admin-main">{children}</main>
    </div>
  );
}
