import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { addressSchema } from "@/lib/schemas";
import { ok, fail } from "@/lib/api";

const list = (userId: string) =>
  prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] });

export async function GET() {
  const user = await requireUser();
  if (!user) return ok([]);
  return ok(await list(user.id));
}

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  const p = addressSchema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);

  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= 10) return fail("You can save up to 10 addresses. Delete one first.");

  const makeDefault = p.data.isDefault || count === 0;
  const [, created] = await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: user.id }, data: makeDefault ? { isDefault: false } : {} }),
    prisma.address.create({ data: { ...p.data, isDefault: makeDefault, userId: user.id } }),
  ]);
  return ok(created, 201);
}
