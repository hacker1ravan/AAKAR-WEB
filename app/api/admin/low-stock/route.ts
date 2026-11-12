import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { getSettings } from "@/lib/settings";

export const GET = adminRoute(async () => {
  const { lowStockThreshold: t } = await getSettings();
  const products = await prisma.product.findMany({
    where: { variants: { some: { stock: { lte: t } } } },
    include: { variants: { orderBy: [{ color: "asc" }, { size: "asc" }] } },
  });

  const rows = products
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      image: p.images[0] ?? "",
      price: p.price,
      variants: p.variants,
      totalStock: p.variants.reduce((n, v) => n + v.stock, 0),
      lowCount: p.variants.filter((v) => v.stock > 0 && v.stock <= t).length,
      outCount: p.variants.filter((v) => v.stock === 0).length,
      minStock: Math.min(...p.variants.map((v) => v.stock)),
    }))
    .sort((a, b) => a.minStock - b.minStock); // most urgent first

  return ok({ threshold: t, products: rows });
});
