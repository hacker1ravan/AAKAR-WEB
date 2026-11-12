import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok } from "@/lib/api";
import { bannerSchema, bannerData } from "@/lib/schemas";

export const GET = adminRoute(async () =>
  ok(await prisma.banner.findMany({ orderBy: [{ position: "asc" }, { id: "desc" }] }))
);

export const POST = adminRoute(async (_, { body }) => {
  const b = await prisma.banner.create({ data: bannerData(body) });
  revalidatePath("/");
  return ok(b, 201);
}, bannerSchema);
