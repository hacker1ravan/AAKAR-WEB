import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { issueVerification } from "@/lib/verification";
import { ok, fail } from "@/lib/api";

// Same answer whether or not the email exists, so nobody can check who has an account.
export async function POST(req: Request) {
  if (!(await rateLimit(`resend:${clientIp(req)}`, 5, 900))) return fail("Too many attempts. Try later.", 429);
  const p = z.object({ email: z.string().email() }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Enter a valid email");
  const email = p.data.email.toLowerCase();
  if (!(await rateLimit(`resend:${email}`, 1, 60))) return ok();

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.role === "customer" && !user.emailVerified) {
    await issueVerification(user);
  } else if (user?.role === "guest") {
    const rec = await prisma.emailVerification.findFirst({
      where: { userId: user.id, pendingPassword: { not: null } },
      orderBy: { createdAt: "desc" },
    });
    if (rec?.pendingPassword) await issueVerification(user, { name: rec.pendingName ?? "", password: rec.pendingPassword });
  }
  return ok();
}
