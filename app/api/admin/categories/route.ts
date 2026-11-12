import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { categorySchema } from "@/lib/schemas";

export const GET = adminRoute(async () => {
  const [cats, counts] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }),
    prisma.product.groupBy({ by: ["category"], _count: { _all: true } }),
  ]);
  const n = new Map(counts.map((c) => [c.category, c._count._all]));
  return ok(cats.map((c) => ({ ...c, products: n.get(c.name) ?? 0 })));
});

export const POST = adminRoute(async (_, { body }) => {
  if (await prisma.category.findUnique({ where: { name: body.name } }))
    return fail("Category already exists", 409);
  return ok(await prisma.category.create({ data: body }), 201);
}, categorySchema);
