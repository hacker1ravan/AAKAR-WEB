import { prisma } from "@/lib/prisma";
import { adminRoute, fail } from "@/lib/api";
import { csvResponse } from "@/lib/csv";
import { getSettings } from "@/lib/settings";

const STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];
const day = (s: string | null, end: boolean) =>
  s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T${end ? "23:59:59.999" : "00:00:00"}+05:30`) : undefined;
const ist = { timeZone: "Asia/Kolkata" } as const;
const rs = (p: number) => p / 100;

export const GET = adminRoute(async (req) => {
  const q = new URL(req.url).searchParams;
  const from = day(q.get("from"), false);
  const to = day(q.get("to"), true);
  const status = q.get("status") ?? "";
  if (status && !STATUSES.includes(status)) return fail("Invalid status");

  const [orders, s] = await Promise.all([
    prisma.order.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(from || to ? { createdAt: { gte: from, lte: to } } : {}),
      },
      include: { user: { select: { name: true, email: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    }),
    getSettings(),
  ]);

  const rows: unknown[][] = [[
    "Order ID", "Invoice no", "Date", "Time", "Customer", "Email", "Phone", "Status", "Payment",
    "Items", "Subtotal (INR)", "Discount (INR)", "Coupon", "Shipping (INR)", "COD fee (INR)", "Total (INR)",
    "Courier", "Tracking number", "Pincode", "Address",
  ]];
  for (const o of orders) {
    rows.push([
      o.id.slice(-8).toUpperCase(),
      ["pending", "cancelled"].includes(o.status) ? "" : `${s.invoicePrefix}${String(o.invoiceNo).padStart(5, "0")}`,
      o.createdAt.toLocaleDateString("en-CA", ist),
      o.createdAt.toLocaleTimeString("en-GB", { ...ist, hour: "2-digit", minute: "2-digit" }),
      o.shippingName || o.user.name || "",
      o.user.email,
      o.shippingPhone,
      o.status,
      o.paymentMethod === "cod" ? "COD" : "Online",
      o.items.map((i) => `${i.name} (${i.color}, ${i.size}) x${i.quantity}`).join("; "),
      rs(o.subtotal), rs(o.discount), o.couponCode, rs(o.shipping), rs(o.codFee), rs(o.total),
      o.courier, o.trackingNumber, o.shippingPincode,
      o.shippingAddress.replace(/\s*\n\s*/g, ", "),
    ]);
  }
  return csvResponse(`orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
});
