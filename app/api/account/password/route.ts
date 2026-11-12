import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { rateLimit } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(100),
  newPassword: z.string().min(8, "The new password must be at least 8 characters").max(100),
});

export async function PUT(req: Request) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  if (!(await rateLimit(`pw:${user.id}`, 5, 900))) return fail("Too many attempts. Try again in 15 minutes.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);
  if (p.data.currentPassword === p.data.newPassword) return fail("Choose a password you have not used just now");

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
  if (!row || !(await bcrypt.compare(p.data.currentPassword, row.password))) return fail("Your current password is not correct");

  await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(p.data.newPassword, 10), sessionVersion: { increment: 1 } } });
  return ok();
}
