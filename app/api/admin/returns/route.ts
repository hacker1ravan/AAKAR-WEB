import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

export const GET = adminRoute(async () =>
  ok(
    await prisma.returnRequest.findMany({
      include: { order: { include: { user: { select: { name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
    })
  )
);
