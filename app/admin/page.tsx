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
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <Link href="/admin/sales" className="btn btn-outline btn-sm">See sales charts</Link>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([title, v]) => (
          <div key={title} className="stat-card">
            <p className="stat-label">{title}</p>
            <p className="stat-value">{v}</p>
          </div>
        ))}
      </div>
      <section className="surface p-4 md:p-5">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
          <h2 className="font-serif text-lg font-semibold">Low stock <span className="text-[var(--muted)] font-sans text-sm font-normal">({t} or less)</span></h2>
          <Link href="/admin/low-stock" className="btn btn-link btn-sm">See all</Link>
        </div>
        <div className="divide-y divide-[var(--line)]">
          {low.map((v) => (
            <p key={v.id} className="text-sm py-1.5 flex flex-wrap justify-between gap-2">
              <span className="text-[var(--ink-soft)]">{v.product.category} · {v.product.name} · {v.color} · {v.size}</span>
              <b className={v.stock === 0 ? "text-red-600" : "text-[var(--ink)]"}>{v.stock === 0 ? "Out of stock" : v.stock}</b>
            </p>
          ))}
        </div>
        {!low.length && <p className="text-sm text-[var(--muted)]">All good — nothing running low.</p>}
      </section>
    </div>
  );
}
