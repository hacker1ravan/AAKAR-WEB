import crypto from "crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({ token: z.string().min(10), password: z.string().min(8).max(100) });
const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export async function POST(req: Request) {
  if (!(await rateLimit(`reset:${clientIp(req)}`, 10, 900))) return fail("Too many attempts. Try later.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Password must be at least 8 characters");

  const rec = await prisma.passwordReset.findUnique({ where: { tokenHash: hash(p.data.token) } });
  if (!rec || rec.expiresAt < new Date())
    return fail("This link is invalid or has expired. Please request a new one.");

  await prisma.$transaction([
    prisma.user.update({
      where: { id: rec.userId },
      data: { password: await bcrypt.hash(p.data.password, 10), sessionVersion: { increment: 1 } },
    }),
    prisma.user.updateMany({ where: { id: rec.userId, emailVerified: null }, data: { emailVerified: new Date() } }),
    prisma.passwordReset.deleteMany({ where: { userId: rec.userId } }),
  ]);
  return ok();
}
