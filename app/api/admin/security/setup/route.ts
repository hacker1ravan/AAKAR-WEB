import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireAdminAny } from "@/lib/requireAdmin";
import { getSettings } from "@/lib/settings";
import { encrypt } from "@/lib/crypto";
import { newSecret, totpUri } from "@/lib/totp";
import { ok, fail } from "@/lib/api";

// Step 1 of switching on two-factor login: make a secret and show it as a QR code.
export async function POST() {
  const s = await requireAdminAny();
  if (!s) return fail("Forbidden", 403);
  const me = s.user as any;
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { totpEnabled: true, email: true } });
  if (!u) return fail("Forbidden", 403);
  if (u.totpEnabled) return fail("Two-factor login is already on. Turn it off first to set it up again.", 409);

  const secret = newSecret();
  await prisma.user.update({ where: { id: me.id }, data: { totpSecret: encrypt(secret), totpLastStep: 0 } });
  const url = totpUri(secret, u.email, (await getSettings()).siteName);
  return ok({ secret, otpauthUrl: url, qr: await QRCode.toDataURL(url, { margin: 1, width: 220 }) });
}
