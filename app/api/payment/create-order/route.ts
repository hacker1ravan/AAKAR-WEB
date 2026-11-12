import { prisma } from "@/lib/prisma";
import { razorpay } from "@/lib/razorpay";
import { getSettings } from "@/lib/settings";
import { canAccessOrder } from "@/lib/orderAccess";
import { reportError } from "@/lib/monitor";
import { ok, fail } from "@/lib/api";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const order = await prisma.order.findUnique({
    where: { id: String(body.orderId) },
    include: { user: { select: { email: true } } },
  });
  // The owner, or a guest holding the order's private token
  if (!order || !(await canAccessOrder(order, typeof body.accessToken === "string" ? body.accessToken : null)))
    return fail("Order not found", 404);
  if (order.status !== "pending") return fail("This order is already processed", 409);
  if (order.paymentMethod === "cod") return fail("This is a Cash on Delivery order", 400);

  const s = await getSettings();
  const reply = (razorpayOrderId: string, amount: number) =>
    ok({ razorpayOrderId, amount, storeName: s.siteName, email: order.user.email });

  // Retrying payment for the same order reuses its Razorpay order instead of creating a second one.
  if (order.razorpayOrderId) return reply(order.razorpayOrderId, order.total);

  try {
    const rp = await razorpay().orders.create({ amount: order.total, currency: "INR", receipt: order.id });
    await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rp.id } });
    return reply(rp.id, Number(rp.amount));
  } catch (e) {
    await reportError(e, "Razorpay order creation");
    return fail("Could not start the payment. Please try again in a moment.", 502);
  }
}
