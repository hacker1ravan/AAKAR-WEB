import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { ok, fail } from "@/lib/api";

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  const p = z.object({ name: z.string().trim().min(1, "Enter your name").max(80) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);
  await prisma.user.update({ where: { id: user.id }, data: { name: p.data.name } });
  return ok();
}
