import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({ variantIds: z.array(z.string().min(1)).min(1).max(50) });

// Current price / stock / availability for the variants in a cart, so the cart can refresh
// values it cached in the browser when the item was added. Read-only; no prices are trusted
// from the client (checkout and order creation re-price from the database regardless).
export async function POST(req: Request) {
  if (!(await rateLimit(`cartvalidate:${clientIp(req)}`, 120, 600)))
    return fail("Too many requests. Try again shortly.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid input");

  const variants = await prisma.variant.findMany({
    where: { id: { in: [...new Set(p.data.variantIds)] } },
    select: {
      id: true, size: true, color: true,
      stock: true,
      product: { select: { name: true, price: true, active: true, images: true, category: true } },
    },
  });

  // A product in a switched-off category cannot be sold, like a hidden product.
  const cats = await prisma.category.findMany({
    where: { name: { in: [...new Set(variants.map((v: any) => v.product.category))] } },
    select: { name: true, active: true },
  });
  const inactiveCat = new Set(cats.filter((c: any) => !c.active).map((c: any) => c.name));

  // Only live products are purchasable; a hidden product (or one in an off category) drops out of the cart.
  return ok({
    items: variants
      .filter((v: any) => v.product.active && !inactiveCat.has(v.product.category))
      .map((v: any) => ({
        variantId: v.id,
        name: v.product.name,
        image: v.product.images[0] ?? "",
        size: v.size,
        color: v.color,
        price: v.product.price,
        stock: v.stock,
      })),
  });
}
