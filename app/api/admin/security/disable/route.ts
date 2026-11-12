import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAny } from "@/lib/requireAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { verifyTotp, hashRecovery } from "@/lib/totp";
import { ok, fail } from "@/lib/api";

// Turning two-factor off needs the password and a current code (or a backup code). Everyone is logged out after.
export async function POST(req: Request) {
  const s = await requireAdminAny();
  if (!s) return fail("Forbidden", 403);
  const me = s.user as any;
  if (!(await rateLimit(`2fa-setup:${me.id}`, 10, 900))) return fail("Too many attempts. Try again in 15 minutes.", 429);
  const p = z.object({ password: z.string().min(1).max(100), code: z.string().min(6).max(20) }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Enter your password and a code");

  const u = await prisma.user.findUnique({ where: { id: me.id } });
  if (!u?.totpEnabled || !u.totpSecret) return fail("Two-factor login is not on.", 409);
  if (!(await bcrypt.compare(p.data.password, u.password))) return fail("Your password is not correct");
  const code = p.data.code.trim();
  const valid = /^\d{6}$/.test(code)
    ? verifyTotp(decrypt(u.totpSecret), code, u.totpLastStep) !== null
    : u.recoveryCodes.includes(hashRecovery(code));
  if (!valid) return fail("That code is not correct");

  await prisma.user.update({
    where: { id: me.id },
    data: { totpEnabled: false, totpSecret: null, recoveryCodes: [], totpLastStep: 0, sessionVersion: { increment: 1 } },
  });
  await audit({ actor: me, action: "two-factor login switched off" });
  return ok();
}
