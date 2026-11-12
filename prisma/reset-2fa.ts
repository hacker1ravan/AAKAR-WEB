// Locked out of the admin panel (lost phone and backup codes)? Run this from your computer:
//   ADMIN_EMAIL=you@example.com npx tsx prisma/reset-2fa.ts
// It switches off two-factor login for that admin and logs them out everywhere. You can set it up again after logging in.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email) throw new Error("Set ADMIN_EMAIL");
  const r = await prisma.user.updateMany({
    where: { email, role: "admin" },
    data: { totpEnabled: false, totpSecret: null, recoveryCodes: [], totpLastStep: 0, sessionVersion: { increment: 1 } },
  });
  console.log(r.count ? `Two-factor login switched off for ${email}` : `No admin found with the email ${email}`);
}

main().finally(() => prisma.$disconnect());
