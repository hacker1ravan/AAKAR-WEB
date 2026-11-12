import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/format";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "My orders" };

export default async function MyOrders() {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) redirect("/login");
  const orders = await prisma.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <main className="max-w-xl mx-auto p-4 space-y-3">
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.map((o) => (
        <Link key={o.id} href={`/orders/${o.id}`} className="block border rounded p-3">
          <div className="flex justify-between">
            <span>#{o.id.slice(-8).toUpperCase()}</span>
            <span className="capitalize">{o.status}</span>
          </div>
          <div className="text-sm">{inr(o.total)} · {fmtDate(o.createdAt)}</div>
        </Link>
      ))}
      {!orders.length && <p>No orders yet.</p>}
    </main>
  );
}
