import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { bannerSchema, bannerData } from "@/lib/schemas";

export const PUT = adminRoute(async (_, { params, body }) => {
  const b = await prisma.banner.update({ where: { id: params.id }, data: bannerData(body) });
  revalidatePath("/");
  return ok(b);
}, bannerSchema);

export const DELETE = adminRoute(async (_, { params }) => {
  await prisma.banner.delete({ where: { id: params.id } });
  revalidatePath("/");
  return ok();
});
