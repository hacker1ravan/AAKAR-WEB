import { prisma } from "./prisma";
import { PAID_STATUSES } from "./constants";

export async function loadCustomers() {
  const [users, stats, phones] = await Promise.all([
    prisma.user.findMany({
      where: { role: "customer" },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: { in: PAID_STATUSES } },
      _sum: { total: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.order.findMany({
      distinct: ["userId"],
      orderBy: { createdAt: "desc" },
      select: { userId: true, shippingPhone: true },
    }),
  ]);
  const s = new Map(stats.map((x) => [x.userId, x]));
  const p = new Map(phones.map((x) => [x.userId, x.shippingPhone]));
  return users.map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    phone: p.get(u.id) ?? "",
    joined: u.createdAt,
    orders: s.get(u.id)?._count._all ?? 0,
    spent: s.get(u.id)?._sum.total ?? 0,
    lastOrder: s.get(u.id)?._max.createdAt ?? null,
  }));
}
