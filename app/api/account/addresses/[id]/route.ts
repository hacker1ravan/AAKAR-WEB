import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { addressSchema } from "@/lib/schemas";
import { ok, fail } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  const { id } = await ctx.params;
  const own = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!own) return fail("Address not found", 404);

  const p = addressSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);

  const [, updated] = await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id, NOT: { id } }, data: p.data.isDefault ? { isDefault: false } : {} }),
    prisma.address.update({ where: { id }, data: { ...p.data, isDefault: p.data.isDefault || own.isDefault } }),
  ]);
  return ok(updated);
}

export async function DELETE(_: Request, ctx: Ctx) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  const { id } = await ctx.params;
  const own = await prisma.address.findFirst({ where: { id, userId: user.id } });
  if (!own) return fail("Address not found", 404);

  await prisma.address.delete({ where: { id } });
  if (own.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return ok();
}
