import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { newToken } from "@/lib/token";
import { ok, fail } from "@/lib/api";

const schema = z.object({ password: z.string().min(1).max(100), confirm: z.literal("DELETE") });

// Deletes a customer's personal data. Order records are kept without the name, phone and address,
// because the store must keep its sales and tax records. Ask your accountant how long.
export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  if (user.role !== "customer") return fail("This account cannot be deleted here.", 403);
  if (!(await rateLimit(`delete:${user.id}`, 5, 900))) return fail("Too many attempts. Try again in 15 minutes.", 429);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail('Enter your password and type DELETE to confirm');

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } });
  if (!row || !(await bcrypt.compare(p.data.password, row.password))) return fail("Your password is not correct");

  const open = await prisma.order.count({
    where: {
      userId: user.id,
      OR: [
        { status: { in: ["pending", "paid", "processing", "shipped"] } },
        { returns: { some: { status: { in: ["requested", "approved", "received"] } } } },
      ],
    },
  });
  if (open) return fail("You still have an order or return in progress. Please wait until it is finished, or cancel it, then try again.", 409);

  const id = user.id;
  await prisma.$transaction([
    prisma.address.deleteMany({ where: { userId: id } }),
    prisma.wishlist.deleteMany({ where: { userId: id } }),
    prisma.review.deleteMany({ where: { userId: id } }),
    prisma.emailVerification.deleteMany({ where: { userId: id } }),
    prisma.passwordReset.deleteMany({ where: { userId: id } }),
    prisma.order.updateMany({
      where: { userId: id },
      data: { shippingName: "Deleted customer", shippingPhone: "", shippingAddress: "Removed at the customer's request" },
    }),
    prisma.user.update({
      where: { id },
      data: {
        email: `deleted-${id}@deleted.invalid`,
        name: "Deleted customer",
        password: await bcrypt.hash(newToken(), 10),
        role: "deleted",
        emailVerified: null,
        sessionVersion: { increment: 1 },
      },
    }),
  ]);
  await audit({ actor: { id }, action: "customer deleted their account" }); // the log keeps no email address
  return ok();
}
