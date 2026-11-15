import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { adminRoute, ok, fail } from "@/lib/api";
import { sendMail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { razorpay } from "@/lib/razorpay";

const schema = z.object({
  status: z.enum(["approved", "rejected", "received", "refunded"]),
  adminNote: z.string(),
});

// Allowed steps: requested -> approved or rejected -> received -> refunded
const NEXT: Record<string, string[]> = {
  requested: ["approved", "rejected"],
  approved: ["received"],
  received: ["refunded"],
};

const TEXT = {
  approved: "Your return is approved. Please send the item back to the address below.",
  rejected: "Sorry, we could not approve your return request.",
  received: "We received your returned item and are checking it.",
  refunded: "Your refund has been issued. It can take 5 to 7 business days to reach your account.",
};

export const PUT = adminRoute(async (_, { params, body }) => {
  const r = await prisma.returnRequest.findUnique({
    where: { id: params.id },
    include: { order: { include: { user: true } } },
  });
  if (!r) return fail("Not found", 404);

  const next = NEXT[r.status] ?? [];
  if (!next.includes(body.status)) {
    return fail(
      r.status === "refunded" || r.status === "rejected"
        ? `This return is already ${r.status}`
        : `A ${r.status} return can only be moved to: ${next.join(" or ")}`,
      409
    );
  }

  const online = body.status === "refunded" && r.order.paymentMethod !== "cod";
  if (online && !r.order.razorpayPaymentId) return fail("No payment found for this order");

  // Atomically claim this transition. If two requests arrive together (double click, two tabs),
  // only one moves the return out of its current status; the other gets count 0 and stops here.
  // Without this guard both could pass the check above and refund the customer twice.
  const claim = await prisma.returnRequest.updateMany({
    where: { id: r.id, status: r.status },
    data: { status: body.status, adminNote: body.adminNote },
  });
  if (claim.count === 0) return fail("This return was just updated. Please refresh and try again.", 409);

  if (online) {
    try {
      await razorpay().payments.refund(r.order.razorpayPaymentId!, { amount: r.order.total });
    } catch (e) {
      console.error(e);
      // The refund did not go through, so undo the status change we just claimed.
      await prisma.returnRequest.updateMany({
        where: { id: r.id, status: "refunded" },
        data: { status: r.status, adminNote: r.adminNote },
      });
      return fail("Razorpay refund failed", 502);
    }
  }

  const updated = await prisma.returnRequest.findUnique({ where: { id: r.id } });

  const s = await getSettings();
  const lines = [
    `Hi ${r.order.user.name ?? "there"},`,
    body.status === "refunded" && r.order.paymentMethod === "cod"
      ? "Your return is complete. As this was a Cash on Delivery order, we will contact you to send your refund by UPI or bank transfer."
      : TEXT[body.status],
  ];
  if (body.adminNote) lines.push(`Note: ${body.adminNote}`);
  if (body.status === "approved") lines.push(`Return address: ${s.address || "please contact us"}`);
  await sendMail(r.order.user.email, `${s.siteName}: return ${body.status}`, lines);
  return ok(updated);
}, schema);
