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
      product: { select: { name: true, price: true, active: true, images: true } },
    },
  });

  // Only live products are purchasable; a hidden product drops out of the cart.
  return ok({
    items: variants
      .filter((v: any) => v.product.active)
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
