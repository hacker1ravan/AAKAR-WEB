import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/requireUser";
import { priceCart, UserError } from "@/lib/pricing";
import { setOrderStatus } from "@/lib/orders";
import { alertLowStock } from "@/lib/stock";
import { sendMail } from "@/lib/mailer";
import { getSettings } from "@/lib/settings";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { reportError } from "@/lib/monitor";
import { expireStaleOrders } from "@/lib/expiry";
import { isStateCode } from "@/lib/gst";
import { newToken } from "@/lib/token";
import { inr } from "@/lib/format";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(10) })).min(1),
  couponCode: z.string().max(20).optional(),
  paymentMethod: z.enum(["online", "cod"]),
  shippingName: z.string().trim().min(1).max(80),
  shippingPhone: z.string().regex(/^[6-9]\d{9}$/),
  shippingPincode: z.string().regex(/^[1-9]\d{5}$/),
  shippingState: z.string().refine(isStateCode, "choose your state"),
  shippingAddress: z.string().trim().min(10).max(300),
  guestEmail: z.string().email().optional(), // needed when checking out without an account
  saveAddress: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await requireUser();

  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return fail(
      "Please check: " + p.error.issues[0].path.join(".") + " (phone: 10 digits, pincode: 6 digits, choose your state)"
    );
  const { items, couponCode, paymentMethod, guestEmail, saveAddress, ...address } = p.data;

  // Who is buying: a logged-in customer, or a guest identified by email
  let userId: string;
  if (session) {
    userId = session.id;
  } else {
    if (!guestEmail) return fail("Enter your email address so we can send your order updates");
    if (!(await rateLimit(`order:${clientIp(req)}`, 20, 600))) return fail("Too many orders from this connection. Try again later.", 429);
    const email = guestEmail.toLowerCase();
    let guest = await prisma.user.findUnique({ where: { email } });
    if (guest && guest.role !== "guest")
      return fail("An account with this email already exists. Please log in to place your order.", 409);
    if (!guest) {
      try {
        guest = await prisma.user.create({
          data: { email, name: address.shippingName, password: await bcrypt.hash(newToken(), 10), role: "guest" },
        });
      } catch {
        guest = await prisma.user.findUnique({ where: { email } }); // created by a parallel request
      }
    }
    if (!guest || guest.role !== "guest") return fail("Could not place the order. Please try again.", 409);
    userId = guest.id;
  }

  // release stock held by unpaid orders first, so it is available to this buyer
  await expireStaleOrders().catch(() => {});

  const crossed: string[] = [];
  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const cart = await priceCart(items, couponCode, userId, tx, {
          method: paymentMethod,
          pincode: address.shippingPincode,
        });
        if (cart.couponError) throw new UserError(cart.couponError);
        if (!cart.pin.deliverable) throw new UserError("Sorry, we do not deliver to this pincode yet");
        if (paymentMethod === "cod" && !cart.codAvailable)
          throw new UserError(
            cart.codBlocked.length
              ? `Cash on Delivery is not available for: ${cart.codBlocked.join(", ")}`
              : "Cash on Delivery is not available for this order"
          );

        // reserve stock: the update only succeeds if enough stock is left
        for (const { variant: v, qty } of cart.lines) {
          const r = await tx.variant.updateMany({
            where: { id: v.id, stock: { gte: qty } },
            data: { stock: { decrement: qty } },
          });
          if (r.count === 0) throw new UserError(`${v.product.name} (${v.size}) is out of stock`);
          const t = cart.s.lowStockThreshold;
          if (v.stock > t && v.stock - qty <= t) crossed.push(v.id);
        }

        if (cart.coupon) {
          const c = cart.coupon;
          const claim = await tx.coupon.updateMany({
            where: { id: c.id, ...(c.usageLimit > 0 ? { usedCount: { lt: c.usageLimit } } : {}) },
            data: { usedCount: { increment: 1 } },
          });
          if (claim.count === 0) throw new UserError("This coupon is fully used");
        }

        return tx.order.create({
          data: {
            userId,
            accessToken: newToken(24),
            ...address,
            paymentMethod,
            subtotal: cart.subtotal,
            shipping: cart.shipping,
            discount: cart.discount,
            codFee: cart.codFee,
            couponCode: cart.coupon?.code ?? "",
            total: cart.total,
            items: {
              create: cart.lines.map(({ variant: v, qty }) => ({
                variantId: v.id,
                productId: v.productId,
                quantity: qty,
                price: v.product.price,
                name: v.product.name,
                size: v.size,
                color: v.color,
                image: v.product.images[0] ?? "",
                gstRate: v.product.gstRate,
                hsnCode: v.product.hsnCode,
              })),
            },
            events: { create: { status: "pending", note: "Order placed" } },
          },
        });
      },
      { maxWait: 10000, timeout: 20000 }
    );

    if (paymentMethod === "cod") {
      await setOrderStatus(order.id, "processing", { note: "Order confirmed (Cash on Delivery)" });
      const s = await getSettings();
      await sendMail(s.contactEmail, `New COD order #${order.id.slice(-8).toUpperCase()}`, [
        `Collect ${inr(order.total)} on delivery.`,
        "Open the admin panel to process it.",
      ]);
    }

    // Remember the address for next time (logged-in customers only)
    if (session && saveAddress) {
      try {
        const [count, same] = await Promise.all([
          prisma.address.count({ where: { userId } }),
          prisma.address.findFirst({ where: { userId, pincode: address.shippingPincode, address: address.shippingAddress } }),
        ]);
        if (!same && count < 10)
          await prisma.address.create({
            data: {
              userId,
              name: address.shippingName,
              phone: address.shippingPhone,
              pincode: address.shippingPincode,
              state: address.shippingState,
              address: address.shippingAddress,
              isDefault: count === 0,
            },
          });
      } catch (e) {
        console.error("Could not save address", e);
      }
    }

    await alertLowStock(crossed);
    return ok({ orderId: order.id, accessToken: order.accessToken }, 201);
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, 409);
    await reportError(e, "POST /api/orders");
    return fail("Could not place order", 500);
  }
}
