import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(1),
  details: z.string().max(500),
});

export async function POST(req: Request) {
  const user = (await getServerSession(authOptions))?.user as any;
  if (!user) return fail("Please log in", 401);

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid input");

  const [order, s] = await Promise.all([
    prisma.order.findUnique({ where: { id: p.data.orderId }, include: { returns: true, user: true } }),
    getSettings(),
  ]);
  if (!order || order.userId !== user.id) return fail("Order not found", 404);
  if (order.status !== "delivered" || !order.deliveredAt) return fail("Only delivered orders can be returned");
  if (Date.now() - order.deliveredAt.getTime() > s.returnWindowDays * 86400000)
    return fail(`The ${s.returnWindowDays}-day return window has passed`);
  if (order.returns.length) return fail("A return is already requested", 409);

  const r = await prisma.returnRequest.create({ data: p.data });
  const ref = `#${order.id.slice(-8).toUpperCase()}`;
  await sendMail(order.user.email, `${s.siteName}: return request received`, [
    `We received your return request for order ${ref}.`,
    "We will review it and email you soon.",
  ]);
  await sendMail(s.contactEmail, `New return request ${ref}`, [`Reason: ${p.data.reason}`, "Review it in Admin > Returns."]);
  return ok(r, 201);
}
