import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/format";
import { DataTable } from "@/components/admin/DataTable";
import { fmtDate } from "@/lib/format";

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) notFound();
  const orders = await prisma.order.findMany({
    where: { userId: id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  const last = orders[0];
  const spent = orders.filter((o) => !["pending", "cancelled"].includes(o.status)).reduce((n, o) => n + o.total, 0);

  return (
    <div className="p-4 space-y-4 max-w-3xl mx-auto">
      <Link href="/admin/customers" className="underline text-sm">Back to customers</Link>
      <h1 className="text-2xl font-bold">{user.name || user.email}</h1>
      <div className="border rounded p-3 text-sm space-y-1">
        <p>Email: {user.email}</p>
        {last && <p>Phone: {last.shippingPhone}</p>}
        {last && <p>Last address: {last.shippingAddress} ({last.shippingPincode})</p>}
        <p>Joined: {fmtDate(user.createdAt)}</p>
        <p>Orders: {orders.length} · Total spent: <b>{inr(spent)}</b></p>
      </div>
      <DataTable
        rows={orders}
        cols={[
          { header: "Order", render: (o) => "#" + o.id.slice(-8).toUpperCase() },
          { header: "Date", render: (o) => fmtDate(o.createdAt) },
          { header: "Items", render: (o) => o.items.map((i) => `${i.name} x${i.quantity}`).join(", ") },
          { header: "Payment", render: (o) => (o.paymentMethod === "cod" ? "COD" : "Online") },
          { header: "Total", render: (o) => inr(o.total) },
          { header: "Status", render: (o) => o.status },
        ]}
      />
    </div>
  );
}
