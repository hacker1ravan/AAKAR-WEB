import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";

export const PUT = adminRoute(
  async (_, { params, body }) =>
    ok(await prisma.review.update({ where: { id: params.id }, data: { status: body.status } })),
  z.object({ status: z.enum(["approved", "rejected"]) })
);

export const DELETE = adminRoute(async (_, { params }) => {
  await prisma.review.delete({ where: { id: params.id } });
  return ok();
});
