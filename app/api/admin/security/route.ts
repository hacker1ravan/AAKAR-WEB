import { prisma } from "@/lib/prisma";
import { requireAdminAny } from "@/lib/requireAdmin";
import { ok, fail } from "@/lib/api";

export async function GET() {
  const s = await requireAdminAny();
  if (!s) return fail("Forbidden", 403);
  const u = await prisma.user.findUnique({ where: { id: (s.user as any).id }, select: { totpEnabled: true, recoveryCodes: true } });
  return ok({ enabled: !!u?.totpEnabled, recoveryLeft: u?.recoveryCodes.length ?? 0, required: process.env.ADMIN_REQUIRE_2FA === "1" });
}
