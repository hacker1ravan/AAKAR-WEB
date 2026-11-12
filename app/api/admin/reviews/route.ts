import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

export const GET = adminRoute(async () =>
  ok(
    await prisma.review.findMany({
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    })
  )
);
