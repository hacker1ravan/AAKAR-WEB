import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";

// The copy is hidden and has stock 0 until you edit and publish it
export const POST = adminRoute(async (_, { params }) => {
  const p = await prisma.product.findUnique({ where: { id: params.id }, include: { variants: true } });
  if (!p) return fail("Not found", 404);
  const copy = await prisma.product.create({
    data: {
      name: `Copy of ${p.name}`.slice(0, 120),
      description: p.description,
      price: p.price,
      comparePrice: p.comparePrice,
      category: p.category,
      images: p.images,
      codAvailable: p.codAvailable,
      gstRate: p.gstRate,
      hsnCode: p.hsnCode,
      active: false,
      variants: { create: p.variants.map((v) => ({ size: v.size, color: v.color, stock: 0 })) },
    },
  });
  return ok({ id: copy.id }, 201);
});
