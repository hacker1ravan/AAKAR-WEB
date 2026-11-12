import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { rateLimit, clientIp } from "./rateLimit";
import { audit } from "./audit";
import { decrypt } from "./crypto";
import { verifyTotp, hashRecovery } from "./totp";

const ADMIN_SESSION_SECONDS = 12 * 3600; // admins must log in again after 12 hours

// The second step of a two-factor login: an authenticator code, or a one-time backup code
async function secondFactorOk(user: { id: string; totpSecret: string | null; totpLastStep: number; recoveryCodes: string[] }, code: string) {
  if (/^\d{6}$/.test(code) && user.totpSecret) {
    const step = verifyTotp(decrypt(user.totpSecret), code, user.totpLastStep);
    if (step === null) return false;
    // only the first request to use this code wins
    const claimed = await prisma.user.updateMany({ where: { id: user.id, totpLastStep: { lt: step } }, data: { totpLastStep: step } });
    return claimed.count === 1;
  }
  const hash = hashRecovery(code);
  if (!user.recoveryCodes.includes(hash)) return false;
  const used = await prisma.user.updateMany({
    where: { id: user.id, recoveryCodes: { has: hash } },
    data: { recoveryCodes: user.recoveryCodes.filter((h) => h !== hash) },
  });
  return used.count === 1;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60 }, // logged out after 14 days
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
        code: { type: "text" },
      },
      async authorize(creds, req) {
        if (!creds?.email || !creds?.password) return null;
        const email = creds.email.toLowerCase();
        const ip = clientIp(req as any);
        const key = `login:${ip}:${email}`;
        if (!(await rateLimit(key, 8, 900)))
          throw new Error("Too many attempts. Please try again in 15 minutes.");

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || user.role === "guest" || user.role === "deleted") return null; // no password to check
        if (!(await bcrypt.compare(creds.password, user.password))) {
          if (user.role === "admin") await audit({ actor: user, action: "login failed (wrong password)", ip });
          return null;
        }
        if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

        if (user.totpEnabled) {
          const code = String(creds.code ?? "").trim();
          if (!code) throw new Error("TWO_FACTOR_REQUIRED");
          // a limit that does not depend on the visitor's address, so guessing codes from many places fails too
          if (!(await rateLimit(`2fa:${email}`, 10, 900)))
            throw new Error("Too many attempts. Please try again in 15 minutes.");
          if (!(await secondFactorOk(user, code))) {
            await audit({ actor: user, action: "login failed (wrong two-factor code)", ip });
            throw new Error("TWO_FACTOR_INVALID");
          }
        }

        await prisma.rateLimit.deleteMany({ where: { key } }); // success resets the counter
        if (user.role === "admin") await audit({ actor: user, action: "login", ip });
        return {
          id: user.id, email: user.email, name: user.name, role: user.role,
          sv: user.sessionVersion, tf: user.totpEnabled,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.sv = (user as any).sv;
        token.tf = (user as any).tf;
        token.at = Math.floor(Date.now() / 1000); // when they logged in
        return token;
      }
      if (!token.id) return token;
      // Checked on every visit, so a deleted account, a changed password, a changed role or a
      // switched-off two-factor login takes effect straight away instead of when the cookie expires.
      const u = await prisma.user.findUnique({
        where: { id: String(token.id) },
        select: { role: true, sessionVersion: true, totpEnabled: true },
      });
      if (!u || u.role === "deleted" || u.sessionVersion !== token.sv) return {};
      if (u.role === "admin" && Date.now() / 1000 - Number(token.at ?? 0) > ADMIN_SESSION_SECONDS) return {};
      token.role = u.role;
      token.tf = u.totpEnabled;
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return {} as any; // logged out
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).tf = token.tf;
      }
      return session;
    },
  },
};
