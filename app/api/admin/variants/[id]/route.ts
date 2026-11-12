import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

export const PUT = adminRoute(
  async (_, { params, body }) =>
    ok(await prisma.variant.update({ where: { id: params.id }, data: { stock: body.stock } })),
  z.object({ stock: z.number().int().min(0).max(100000) })
);
