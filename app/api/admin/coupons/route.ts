import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { couponSchema, couponData } from "@/lib/schemas";

export const GET = adminRoute(async () =>
  ok(await prisma.coupon.findMany({ orderBy: { id: "desc" } }))
);

export const POST = adminRoute(async (_, { body }) => {
  const data = couponData(body);
  if (await prisma.coupon.findUnique({ where: { code: data.code } }))
    return fail("Coupon code already exists", 409);
  return ok(await prisma.coupon.create({ data }), 201);
}, couponSchema);
