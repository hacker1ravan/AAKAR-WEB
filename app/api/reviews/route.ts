import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(3).max(500),
});

export async function POST(req: Request) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) return fail("Please log in", 401);
  if (!(await rateLimit(`review:${user.id}`, 10, 3600))) return fail("Too many reviews. Try later.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Write at least a few words and pick a rating");

  // only customers who received this product can review it
  const variants = await prisma.variant.findMany({ where: { productId: p.data.productId }, select: { id: true } });
  const bought = await prisma.order.findFirst({
    where: { userId: user.id, status: "delivered", items: { some: { OR: [{ productId: p.data.productId }, { variantId: { in: variants.map((v) => v.id) } }] } } },
    select: { id: true },
  });
  if (!bought) return fail("Only customers who received this product can review it", 403);

  const u = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true } });
  const userName = (u?.name ?? "Customer").split(" ")[0];

  const r = await prisma.review.upsert({
    where: { productId_userId: { productId: p.data.productId, userId: user.id } },
    update: { rating: p.data.rating, comment: p.data.comment, status: "pending" },
    create: { productId: p.data.productId, userId: user.id, userName, rating: p.data.rating, comment: p.data.comment },
  });
  return ok(r, 201);
}
