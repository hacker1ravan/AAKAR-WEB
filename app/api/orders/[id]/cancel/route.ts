import { prisma } from "@/lib/prisma";
import { canAccessOrder } from "@/lib/orderAccess";
import { setOrderStatus, OrderError } from "@/lib/orders";
import { ok, fail } from "@/lib/api";

// Customers (or guests with their private link) can cancel an unpaid online order, or a Cash on Delivery
// order that has not shipped yet. Paid orders need a refund, so those go through the shop owner.
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const order = await prisma.order.findUnique({
    where: { id },
    select: { userId: true, accessToken: true, status: true, paymentMethod: true },
  });
  if (!order || !(await canAccessOrder(order, typeof body.accessToken === "string" ? body.accessToken : null)))
    return fail("Order not found", 404);

  const allowed = order.paymentMethod === "cod" ? ["processing"] : ["pending"];
  if (!allowed.includes(order.status))
    return fail("This order can no longer be cancelled here. Please contact us.", 409);

  try {
    await setOrderStatus(id, "cancelled", { note: "Cancelled by the customer", onlyFrom: allowed });
  } catch (e) {
    if (e instanceof OrderError) return fail(e.message, 409);
    throw e;
  }
  return ok();
}
