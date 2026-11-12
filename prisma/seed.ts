// Creates your first admin login and the store settings row.
// Run with: npx prisma db seed   (development only: use prisma/set-admin.ts for a live site)
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@yourstore.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "ChangeThisPassword123";

  await prisma.user.upsert({
    where: { email },
    update: { emailVerified: new Date() },
    create: { email, name: "Admin", password: await bcrypt.hash(password, 10), role: "admin", emailVerified: new Date() },
  });

  // Settings need a contact email before they can be saved, so start with the admin's.
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main", contactEmail: email },
  });

  console.log("Admin ready:", email, "(development only: do not use this password on a live site)");
}

main().finally(() => prisma.$disconnect());
