import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { STATUSES } from "@/lib/orders";
import { getSettings } from "@/lib/settings";
import { parseCouriers } from "@/lib/couriers";

const PAGE_SIZE = 25;

// Orders, newest first. Filters: ?status= &method= &q= (order number, name, phone, email or tracking number) &page=
export const GET = adminRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const status = q.get("status") ?? "";
  const method = q.get("method") ?? "";
  const term = (q.get("q") ?? "").trim().slice(0, 60);

  const where: Prisma.OrderWhereInput = {
    ...((STATUSES as readonly string[]).includes(status) ? { status } : {}),
    ...(method === "cod" || method === "online" ? { paymentMethod: method } : {}),
    ...(term
      ? {
          OR: [
            { id: { endsWith: term.toLowerCase() } }, // the short order number shown to customers
            { shippingName: { contains: term, mode: "insensitive" } },
            { shippingPhone: { contains: term } },
            { trackingNumber: { contains: term, mode: "insensitive" } },
            { user: { email: { contains: term, mode: "insensitive" } } },
            { user: { name: { contains: term, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, s] = await Promise.all([prisma.order.count({ where }), getSettings()]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(q.get("page"))) || 1), pages);

  const orders = await prisma.order.findMany({
    where,
    include: {
      user: { select: { name: true, email: true, role: true } },
      items: true,
      events: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return ok({ orders, total, page, pages, couriers: parseCouriers(s.couriers).map((c) => c.name) });
});
