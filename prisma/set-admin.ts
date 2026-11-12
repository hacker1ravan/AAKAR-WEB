import "dotenv/config";
// Production admin: ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' npx tsx prisma/set-admin.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12)
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters)");
  const hash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { password: hash, role: "admin", emailVerified: new Date() },
    create: { email, name: "Admin", password: hash, role: "admin", emailVerified: new Date() },
  });
  console.log("Admin ready:", email);
}

main().finally(() => prisma.$disconnect());
