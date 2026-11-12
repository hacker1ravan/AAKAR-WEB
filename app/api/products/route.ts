import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { productSchema } from "@/lib/schemas";

export const GET = async () =>
  ok(await prisma.product.findMany({ where: { active: true }, include: { variants: true }, orderBy: { createdAt: "desc" } }));

export const POST = adminRoute(async (_, { body }) => {
  const { variants, ...data } = body;
  return ok(
    await prisma.product.create({
      data: { ...data, variants: { create: variants.map(({ id, ...v }) => v) } },
      include: { variants: true },
    }),
    201
  );
}, productSchema);
