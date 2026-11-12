import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/lib/api";

export async function GET() {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) return ok([]);
  const rows = await prisma.wishlist.findMany({ where: { userId: user.id }, select: { productId: true } });
  return ok(rows.map((r) => r.productId));
}

export async function POST(req: Request) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) return fail("Please log in", 401);
  const p = z.object({ productId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid input");
  const { productId } = p.data;

  const exists = await prisma.wishlist.findUnique({ where: { userId_productId: { userId: user.id, productId } } });
  if (exists) {
    await prisma.wishlist.delete({ where: { id: exists.id } });
    return ok({ saved: false });
  }
  const product = await prisma.product.findUnique({ where: { id: productId }, select: { active: true } });
  if (!product?.active) return fail("Not found", 404);
  await prisma.wishlist.create({ data: { userId: user.id, productId } }).catch(() => {});
  return ok({ saved: true });
}
