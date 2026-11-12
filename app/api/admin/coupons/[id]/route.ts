import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { couponSchema, couponData } from "@/lib/schemas";

export const PUT = adminRoute(async (_, { params, body }) => {
  const data = couponData(body);
  const clash = await prisma.coupon.findFirst({ where: { code: data.code, NOT: { id: params.id } } });
  if (clash) return fail("Coupon code already exists", 409);
  return ok(await prisma.coupon.update({ where: { id: params.id }, data }));
}, couponSchema);

export const DELETE = adminRoute(async (_, { params }) => {
  await prisma.coupon.delete({ where: { id: params.id } });
  return ok();
});
