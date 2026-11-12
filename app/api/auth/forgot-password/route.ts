import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { ok, fail } from "@/lib/api";

const schema = z.object({ email: z.string().email() });
const hash = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

// Same answer whether or not the email exists, so nobody can check who has an account.
export async function POST(req: Request) {
  if (!(await rateLimit(`forgot:${clientIp(req)}`, 5, 900))) return fail("Too many attempts. Try later.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Enter a valid email");

  const user = await prisma.user.findUnique({ where: { email: p.data.email.toLowerCase() } });
  if (user && user.role !== "guest") {
    const recent = await prisma.passwordReset.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - 60_000) } },
    });
    if (!recent) {
      const token = crypto.randomBytes(32).toString("hex");
      await prisma.$transaction([
        prisma.passwordReset.deleteMany({
          where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] },
        }),
        prisma.passwordReset.create({
          data: { userId: user.id, tokenHash: hash(token), expiresAt: new Date(Date.now() + 30 * 60_000) },
        }),
      ]);
      const s = await getSettings();
      await sendMail(
        user.email,
        `${s.siteName}: reset your password`,
        [
          `Hi ${user.name ?? "there"},`,
          "We got a request to reset your password. This link works for 30 minutes.",
          "If you did not ask for this, you can ignore this email.",
        ],
        { text: "Reset password", url: `${s.siteUrl}/reset-password?token=${token}` }
      );
    }
  }
  return ok();
}
