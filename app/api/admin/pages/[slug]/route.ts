import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { getPage } from "@/lib/pages";

export const GET = adminRoute(async (_, { params }) => {
  const page = await getPage(params.slug);
  return page ? ok(page) : fail("Not found", 404);
});

export const PUT = adminRoute(
  async (_, { params, body }) => {
    if (!(await getPage(params.slug))) return fail("Not found", 404);
    const page = await prisma.page.update({ where: { slug: params.slug }, data: body });
    revalidatePath(`/${params.slug}`);
    return ok(page);
  },
  z.object({ title: z.string().trim().min(1).max(80), content: z.string().max(20000) })
);
