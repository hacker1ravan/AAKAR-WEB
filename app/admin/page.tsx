import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { PAID_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const t = (await getSettings()).lowStockThreshold;
  const [orders, toShip, revenue, returns, low] = await Promise.all([
    prisma.order.count({ where: { status: { in: PAID_STATUSES } } }),
    prisma.order.count({ where: { status: { in: ["paid", "processing"] } } }),
    prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: PAID_STATUSES } } }),
    prisma.returnRequest.count({ where: { status: "requested" } }),
    prisma.variant.findMany({
      where: { stock: { lte: t } },
      include: { product: { select: { name: true, category: true } } },
      orderBy: { stock: "asc" },
      take: 20,
    }),
  ]);

  const cards: [string, string | number][] = [
    ["Revenue", inr(revenue._sum.total ?? 0)],
    ["Paid orders", orders],
    ["To ship", toShip],
    ["Return requests", returns],
  ];

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/admin/sales" className="underline text-sm">See sales charts</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([title, v]) => (
          <div key={title} className="border rounded-lg p-3">
            <p className="text-xs">{title}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>
      <section>
        <div className="flex justify-between mb-2">
          <h2 className="font-semibold">Low stock ({t} or less)</h2>
          <Link href="/admin/low-stock" className="underline text-sm">See all</Link>
        </div>
        {low.map((v) => (
          <p key={v.id} className="text-sm">
            {v.product.category} · {v.product.name} · {v.color} · {v.size}:{" "}
            <b className={v.stock === 0 ? "text-red-600" : ""}>{v.stock === 0 ? "Out of stock" : v.stock}</b>
          </p>
        ))}
        {!low.length && <p className="text-sm">All good.</p>}
      </section>
    </div>
  );
}
