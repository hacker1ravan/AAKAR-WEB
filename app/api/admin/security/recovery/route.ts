import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAny } from "@/lib/requireAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { verifyTotp, newRecoveryCodes } from "@/lib/totp";
import { ok, fail } from "@/lib/api";

// A fresh set of backup codes (the old ones stop working). Needs a current authenticator code.
export async function POST(req: Request) {
  const s = await requireAdminAny();
  if (!s) return fail("Forbidden", 403);
  const me = s.user as any;
  if (!(await rateLimit(`2fa-setup:${me.id}`, 10, 900))) return fail("Too many attempts. Try again in 15 minutes.", 429);
  const p = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);

  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { totpEnabled: true, totpSecret: true, totpLastStep: true } });
  if (!u?.totpEnabled || !u.totpSecret) return fail("Two-factor login is not on.", 409);
  const step = verifyTotp(decrypt(u.totpSecret), p.data.code, u.totpLastStep);
  if (step === null) return fail("That code is not correct");

  const codes = newRecoveryCodes();
  await prisma.user.update({ where: { id: me.id }, data: { recoveryCodes: codes.hashes, totpLastStep: step } });
  await audit({ actor: me, action: "backup codes renewed" });
  return ok({ recoveryCodes: codes.plain });
}
