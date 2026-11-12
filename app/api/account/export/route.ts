import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { rateLimit } from "@/lib/rateLimit";
import { audit } from "@/lib/audit";
import { fail } from "@/lib/api";

// Everything the store holds about the logged-in customer, as a file they can keep.
export async function GET() {
  const user = await requireUser();
  if (!user) return fail("Please log in", 401);
  if (!(await rateLimit(`export:${user.id}`, 5, 3600))) return fail("You can download your data 5 times an hour. Try again later.", 429);

  const [account, addresses, orders, reviews, wishlist] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, createdAt: true, emailVerified: true } }),
    prisma.address.findMany({ where: { userId: user.id }, select: { label: true, name: true, phone: true, pincode: true, state: true, address: true, isDefault: true, createdAt: true } }),
    prisma.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, invoiceNo: true, createdAt: true, status: true, paymentMethod: true, subtotal: true, shipping: true, discount: true,
        codFee: true, couponCode: true, total: true, shippingName: true, shippingPhone: true, shippingAddress: true,
        shippingPincode: true, courier: true, trackingNumber: true, deliveredAt: true,
        items: { select: { name: true, size: true, color: true, quantity: true, price: true } },
        events: { select: { status: true, note: true, createdAt: true } },
        returns: { select: { reason: true, details: true, status: true, createdAt: true } },
      },
    }),
    prisma.review.findMany({ where: { userId: user.id }, select: { productId: true, rating: true, comment: true, status: true, createdAt: true } }),
    prisma.wishlist.findMany({ where: { userId: user.id }, select: { productId: true, createdAt: true } }),
  ]);

  await audit({ actor: user, action: "customer downloaded their data" });
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), account, addresses, orders, reviews, wishlist }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": 'attachment; filename="my-data.json"',
      "Cache-Control": "private, no-store",
    },
  });
}
