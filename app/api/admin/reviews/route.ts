import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

const PAGE_SIZE = 25;
const STATUSES = ["pending", "approved", "rejected"];

// Reviews, newest first. Filters: ?status= &page=
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const status = sp.get("status") ?? "";
  const where: Prisma.ReviewWhereInput = STATUSES.includes(status) ? { status } : {};

  const total = await prisma.review.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.get("page"))) || 1), pages);

  const reviews = await prisma.review.findMany({
    where,
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return ok({ reviews, total, page, pages });
});
