import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

// Admin list includes hidden products
export const GET = adminRoute(async () =>
  ok(await prisma.product.findMany({ include: { variants: true }, orderBy: { createdAt: "desc" } }))
);
