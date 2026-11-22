import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

const PAGE_SIZE = 25;

// Admin list includes hidden products. Filters: ?q= (name) &category= &hidden=1 (hidden only) &page=
export const GET = adminRoute(async (req) => {
  const sp = new URL(req.url).searchParams;
  const term = (sp.get("q") ?? "").trim().slice(0, 60);
  const category = (sp.get("category") ?? "").trim();
  const hiddenOnly = sp.get("hidden") === "1";

  const where: Prisma.ProductWhereInput = {
    ...(term ? { name: { contains: term, mode: "insensitive" } } : {}),
    ...(category ? { category } : {}),
    ...(hiddenOnly ? { active: false } : {}),
  };

  const total = await prisma.product.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, Math.floor(Number(sp.get("page"))) || 1), pages);

  const products = await prisma.product.findMany({
    where,
    include: { variants: true },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  return ok({ products, total, page, pages });
});
