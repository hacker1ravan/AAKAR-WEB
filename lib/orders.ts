import { prisma } from "./prisma";
import { sendMail } from "./mailer";
import { getSettings } from "./settings";
import { getInvoice } from "./invoice";
import { invoicePdf } from "./invoicePdf";

// Errors safe to show to the admin
export class OrderError extends Error {}

export const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"] as const;

const TEXT: Record<string, string> = {
  paid: "Thank you! Your order is confirmed and we are getting it ready.",
  processing: "We are packing your order.",
  shipped: "Good news, your order has been shipped.",
  delivered: "Your order has been delivered. We hope you love it!",
  cancelled: "Your order has been cancelled.",
};

type Opts = {
  note?: string;
  courier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  notify?: boolean;
  onlyFrom?: string[]; // refuse unless the order is currently in one of these statuses
};

// Every status change goes through here so the timeline, stock and emails stay consistent.
export async function setOrderStatus(orderId: string, status: string, o: Opts = {}) {
  const { note = "", notify = true } = o;

  const order = await prisma.$transaction(async (tx) => {
    const prev = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!prev) throw new OrderError("Order not found");
    if (o.onlyFrom && !o.onlyFrom.includes(prev.status))
      throw new OrderError("This order has already moved on and can no longer be changed here.");
    if (prev.status === "cancelled" && status !== "cancelled")
      throw new OrderError("A cancelled order cannot be reopened. Ask the customer to place a new order.");

    // Cancelling puts the stock (and the coupon use) back, exactly once.
    if (status === "cancelled" && prev.status !== "cancelled") {
      for (const i of prev.items)
        await tx.variant.updateMany({
          where: { id: i.variantId },
          data: { stock: { increment: i.quantity } },
        });
      if (prev.couponCode)
        await tx.coupon.updateMany({
          where: { code: prev.couponCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
    }

    return tx.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(o.courier !== undefined && { courier: o.courier }),
        ...(o.trackingNumber !== undefined && { trackingNumber: o.trackingNumber }),
        ...(o.trackingUrl !== undefined && { trackingUrl: o.trackingUrl }),
        ...(status === "delivered" && { deliveredAt: new Date() }),
        events: { create: { status, note } },
      },
      // never include the password hash
      include: { user: { select: { name: true, email: true, role: true } } },
    });
  });

  if (notify && TEXT[status]) {
    const s = await getSettings();
    const lines = [
      `Hi ${order.user.name ?? "there"},`,
      TEXT[status],
      `Order: #${order.id.slice(-8).toUpperCase()}`,
    ];
    if (note) lines.push(`Note: ${note}`);
    if (status === "shipped" && order.trackingNumber)
      lines.push(`Courier: ${order.courier || "-"}`, `Tracking number: ${order.trackingNumber}`);
    if (status === "shipped" && order.trackingUrl && /^https?:\/\//.test(order.trackingUrl))
      lines.push(`Track your parcel: ${order.trackingUrl}`);

    // The invoice goes out with the "shipped" email.
    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
    if (status === "shipped") {
      try {
        const inv = await getInvoice(order.id);
        if (inv) {
          attachments = [{ filename: `invoice-${inv.no}.pdf`, content: await invoicePdf(inv), contentType: "application/pdf" }];
          lines.push("Your invoice is attached.");
        }
      } catch (e) {
        console.error("Invoice PDF failed", e);
      }
    }

    // Guests have no login, so their email link carries a private token instead.
    const link = order.user.role === "guest" ? `${s.siteUrl}/track/${order.accessToken}` : `${s.siteUrl}/orders/${order.id}`;
    await sendMail(order.user.email, `${s.siteName}: order ${status}`, lines, { text: "Track your order", url: link }, attachments);
  }
  return order;
}

// Used by both the payment verify route and the Razorpay webhook. Safe to run twice.
export async function markOrderPaid(razorpayOrderId: string, paymentId: string) {
  const claimed = await prisma.order.updateMany({
    where: { razorpayOrderId, status: "pending" },
    data: { status: "paid", razorpayPaymentId: paymentId },
  });

  if (claimed.count === 0) {
    // Paid for an order we already cancelled (for example, unpaid orders expire after an hour)
    const o = await prisma.order.findUnique({ where: { razorpayOrderId } });
    if (o?.status === "cancelled" && !o.razorpayPaymentId) {
      await prisma.order.update({ where: { id: o.id }, data: { razorpayPaymentId: paymentId } });
      const s = await getSettings();
      await sendMail(s.contactEmail, "Refund needed: paid for a cancelled order", [
        `Order #${o.id.slice(-8).toUpperCase()} was cancelled but the customer paid (payment ${paymentId}).`,
        "Please refund it from the Razorpay dashboard.",
      ]);
    }
    return;
  }

  const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
  if (!order) return;

  await setOrderStatus(order.id, "paid", { note: "Payment received" });
  const s = await getSettings();
  await sendMail(s.contactEmail, `New order #${order.id.slice(-8).toUpperCase()}`, [
    `Total: ₹${(order.total / 100).toFixed(2)}`,
    "Open the admin panel to process it.",
  ]);
}
