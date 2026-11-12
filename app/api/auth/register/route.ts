import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { issueVerification } from "@/lib/verification";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export async function POST(req: Request) {
  if (!(await rateLimit(`register:${clientIp(req)}`, 5, 3600))) return fail("Too many attempts. Try later.", 429);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail("Invalid input");

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const user = await prisma.user.create({ data: { name, email, password: hash, role: "customer" } }); // role never comes from the client
    await issueVerification(user);
  } else if (existing.role === "guest") {
    // They checked out as a guest before. Their orders join the new account once the email is confirmed.
    await issueVerification(existing, { name, password: hash });
  } else if (existing.role === "customer" && !existing.emailVerified) {
    // Registered before but never confirmed the email: the real owner of the mailbox can take it over.
    const user = await prisma.user.update({ where: { id: existing.id }, data: { name, password: hash } });
    await issueVerification(user);
  } else {
    return fail("Email already registered. Log in, or reset your password if you forgot it.", 409);
  }
  return ok({ success: true, needsVerification: true }, 201);
}
