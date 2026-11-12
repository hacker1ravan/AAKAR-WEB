import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminAny } from "@/lib/requireAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/crypto";
import { verifyTotp, newRecoveryCodes } from "@/lib/totp";
import { ok, fail } from "@/lib/api";

// Step 2: prove the authenticator app works by typing a code. Backup codes are shown once.
export async function POST(req: Request) {
  const s = await requireAdminAny();
  if (!s) return fail("Forbidden", 403);
  const me = s.user as any;
  if (!(await rateLimit(`2fa-setup:${me.id}`, 10, 900))) return fail("Too many attempts. Try again in 15 minutes.", 429);
  const p = z.object({ code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your app") }).safeParse(await req.json().catch(() => null));
  if (!p.success) return fail(p.error.issues[0].message);

  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { totpSecret: true, totpEnabled: true } });
  if (!u?.totpSecret) return fail("Start the setup first.", 409);
  if (u.totpEnabled) return fail("Two-factor login is already on.", 409);
  const step = verifyTotp(decrypt(u.totpSecret), p.data.code, 0);
  if (step === null) return fail("That code is not correct. Check the time on your phone and try again.");

  const codes = newRecoveryCodes();
  await prisma.user.update({ where: { id: me.id }, data: { totpEnabled: true, totpLastStep: step, recoveryCodes: codes.hashes } });
  await audit({ actor: me, action: "two-factor login switched on" });
  return ok({ recoveryCodes: codes.plain });
}
