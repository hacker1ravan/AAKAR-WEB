import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { categorySchema } from "@/lib/schemas";

export const PUT = adminRoute(async (_, { params, body }) => {
  const old = await prisma.category.findUnique({ where: { id: params.id } });
  if (!old) return fail("Not found", 404);
  const clash = await prisma.category.findFirst({ where: { name: body.name, NOT: { id: old.id } } });
  if (clash) return fail("Category already exists", 409);

  // Renaming a category also renames it on its products
  const [cat] = await prisma.$transaction([
    prisma.category.update({ where: { id: old.id }, data: body }),
    prisma.product.updateMany({ where: { category: old.name }, data: { category: body.name } }),
  ]);
  return ok(cat);
}, categorySchema);

export const DELETE = adminRoute(async (req, { params }) => {
  const cat = await prisma.category.findUnique({ where: { id: params.id } });
  if (!cat) return fail("Not found", 404);

  const n = await prisma.product.count({ where: { category: cat.name } });
  if (!n) {
    await prisma.category.delete({ where: { id: cat.id } });
    return ok();
  }

  const moveTo = new URL(req.url).searchParams.get("moveTo");
  if (!moveTo) return fail(`${n} product(s) use this category. Choose a category to move them to.`, 409);
  const target = await prisma.category.findUnique({ where: { name: moveTo } });
  if (!target || target.id === cat.id) return fail("Choose a different, existing category");

  await prisma.$transaction([
    prisma.product.updateMany({ where: { category: cat.name }, data: { category: target.name } }),
    prisma.category.delete({ where: { id: cat.id } }),
  ]);
  return ok();
});
