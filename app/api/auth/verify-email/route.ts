import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { hashToken } from "@/lib/token";
import { ok, fail } from "@/lib/api";

export async function POST(req: Request) {
  if (!(await rateLimit(`verify:${clientIp(req)}`, 20, 900))) return fail("Too many attempts. Try later.", 429);
  const p = z.object({ token: z.string().min(10).max(200) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("This link is not valid.");

  const rec = await prisma.emailVerification.findUnique({ where: { tokenHash: hashToken(p.data.token) } });
  if (!rec || rec.expiresAt < new Date())
    return fail("This link is invalid or has expired. Log in or register again to get a new one.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: {
        emailVerified: new Date(),
        // a guest who registered: the name and password they chose take effect now
        ...(rec.pendingPassword ? { password: rec.pendingPassword, name: rec.pendingName ?? undefined, role: "customer" } : {}),
      },
    }),
    prisma.emailVerification.deleteMany({ where: { userId: rec.userId } }),
  ]);
  return ok();
}
