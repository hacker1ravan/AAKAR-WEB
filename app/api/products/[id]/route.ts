import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { productSchema } from "@/lib/schemas";

export const GET = async (_: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const p = await prisma.product.findUnique({ where: { id }, include: { variants: true } });
  return p && p.active ? ok(p) : fail("Not found", 404);
};

export const PUT = adminRoute(async (_, { params, body }) => {
  const { variants, ...data } = body;
  const keep = variants.filter((v) => v.id).map((v) => v.id!);
  await prisma.$transaction([
    prisma.variant.deleteMany({ where: { productId: params.id, id: { notIn: keep } } }),
    ...variants
      .filter((v) => v.id)
      .map((v) =>
        prisma.variant.updateMany({
          where: { id: v.id!, productId: params.id },
          data: { size: v.size, color: v.color, stock: v.stock },
        })
      ),
    prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        variants: { create: variants.filter((v) => !v.id).map(({ id, ...v }) => v) },
      },
    }),
  ]);
  return ok(await prisma.product.findUnique({ where: { id: params.id }, include: { variants: true } }));
}, productSchema);

const patchSchema = z.object({
  price: z.number().int().positive().optional(),
  comparePrice: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  codAvailable: z.boolean().optional(),
});

export const PATCH = adminRoute(async (_, { params, body }) => {
  const cur = await prisma.product.findUnique({ where: { id: params.id } });
  if (!cur) return fail("Not found", 404);
  const price = body.price ?? cur.price;
  const compare = body.comparePrice ?? cur.comparePrice;
  if (compare !== 0 && compare <= price) return fail("MRP must be higher than the selling price");
  return ok(await prisma.product.update({ where: { id: params.id }, data: body }));
}, patchSchema);

export const DELETE = adminRoute(async (_, { params }) => {
  await prisma.$transaction([
    prisma.review.deleteMany({ where: { productId: params.id } }),
    prisma.wishlist.deleteMany({ where: { productId: params.id } }),
    prisma.variant.deleteMany({ where: { productId: params.id } }),
    prisma.product.delete({ where: { id: params.id } }),
  ]);
  return ok();
});
