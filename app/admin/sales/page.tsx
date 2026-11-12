import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { inr } from "@/lib/format";
import { PAID_STATUSES } from "@/lib/constants";
import { BarChart, HBars } from "@/components/admin/Charts";

export const dynamic = "force-dynamic";

const ist = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export default async function Sales({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;

  const keys = Array.from({ length: days }, (_, i) => ist(new Date(Date.now() - (days - 1 - i) * 86400000)));
  const since = new Date(`${keys[0]}T00:00:00+05:30`);

  const [orders, cancelled, returns, newCustomers] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: since } },
      select: {
        total: true, createdAt: true, paymentMethod: true,
        items: { select: { variantId: true, name: true, quantity: true, price: true } },
      },
    }),
    prisma.order.count({ where: { status: "cancelled", createdAt: { gte: since } } }),
    prisma.returnRequest.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { role: "customer", createdAt: { gte: since } } }),
  ]);

  const revenue = orders.reduce((n, o) => n + o.total, 0);
  const aov = orders.length ? Math.round(revenue / orders.length) : 0;
  const codShare = orders.length ? Math.round((orders.filter((o) => o.paymentMethod === "cod").length / orders.length) * 100) : 0;

  const daily = new Map(keys.map((k) => [k, 0]));
  for (const o of orders) {
    const k = ist(o.createdAt);
    daily.set(k, (daily.get(k) ?? 0) + o.total);
  }
  const series = keys.map((k) => ({ label: k.slice(5), value: daily.get(k) ?? 0 }));
  const best = series.reduce((a, b) => (b.value > a.value ? b : a), series[0]);

  const items = orders.flatMap((o) => o.items);
  const byProduct = new Map<string, { qty: number; revenue: number }>();
  for (const i of items) {
    const x = byProduct.get(i.name) ?? { qty: 0, revenue: 0 };
    x.qty += i.quantity;
    x.revenue += i.price * i.quantity;
    byProduct.set(i.name, x);
  }
  const top = [...byProduct]
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 10)
    .map(([label, v]) => ({ label, value: v.revenue, sub: `${v.qty} sold` }));

  const variants = await prisma.variant.findMany({
    where: { id: { in: [...new Set(items.map((i) => i.variantId))] } },
    select: { id: true, product: { select: { category: true } } },
  });
  const catOf = new Map(variants.map((v) => [v.id, v.product.category]));
  const byCat = new Map<string, number>();
  for (const i of items) {
    const c = catOf.get(i.variantId) ?? "Other";
    byCat.set(c, (byCat.get(c) ?? 0) + i.price * i.quantity);
  }
  const cats = [...byCat].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

  const cards: [string, string | number][] = [
    ["Revenue", inr(revenue)],
    ["Orders", orders.length],
    ["Average order", inr(aov)],
    ["COD orders", `${codShare}%`],
    ["New customers", newCustomers],
    ["Cancelled orders", cancelled],
    ["Return requests", returns],
  ];

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center gap-2">
        <h1 className="text-2xl font-bold">Sales</h1>
        <div className="flex gap-2 text-sm">
          {[7, 30, 90].map((d) => (
            <Link key={d} href={`/admin/sales?days=${d}`}
              className={`border rounded-full px-3 py-1 ${d === days ? "bg-black text-white" : ""}`}>
              {d} days
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map(([title, v]) => (
          <div key={title} className="border rounded-lg p-3">
            <p className="text-xs">{title}</p>
            <p className="text-xl font-bold">{v}</p>
          </div>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Revenue per day</h2>
        <BarChart data={series} format={inr} />
        {best?.value > 0 && <p className="text-xs">Best day: {best.label} ({inr(best.value)})</p>}
      </section>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="space-y-2">
          <h2 className="font-semibold">Top products</h2>
          <HBars rows={top} format={inr} />
        </section>
        <section className="space-y-2">
          <h2 className="font-semibold">Sales by category</h2>
          <HBars rows={cats} format={inr} />
        </section>
      </div>

      <p className="text-xs">
        Revenue counts confirmed orders (paid online, or placed as Cash on Delivery) and does not subtract refunds or discounts on individual products. Dates are in Indian time.
      </p>
    </div>
  );
}
