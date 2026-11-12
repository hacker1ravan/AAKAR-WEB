import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { getSettings } from "./settings";
import { newToken, hashToken } from "./token";

// Creates a fresh confirmation link (24 hours) and emails it.
// For a guest who later registers, the chosen name and password wait in `pending` and are applied only
// after the link is used, so nobody can take over a guest's order history with someone else's email.
export async function issueVerification(
  user: { id: string; email: string; name: string | null },
  pending?: { name: string; password: string }
) {
  const token = newToken();
  await prisma.$transaction([
    prisma.emailVerification.deleteMany({ where: { OR: [{ userId: user.id }, { expiresAt: { lt: new Date() } }] } }),
    prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        pendingName: pending?.name ?? null,
        pendingPassword: pending?.password ?? null,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      },
    }),
  ]);
  const s = await getSettings();
  await sendMail(
    user.email,
    `${s.siteName}: confirm your email`,
    [
      `Hi ${pending?.name ?? user.name ?? "there"},`,
      "Please confirm your email address to finish creating your account. This link works for 24 hours.",
      "If you did not sign up, you can ignore this email.",
    ],
    { text: "Confirm email", url: `${s.siteUrl}/verify-email?token=${token}` }
  );
}
