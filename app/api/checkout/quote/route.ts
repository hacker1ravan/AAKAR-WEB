import { z } from "zod";
import { requireUser } from "@/lib/requireUser";
import { rateLimit, clientIp } from "@/lib/rateLimit";
import { priceCart, UserError } from "@/lib/pricing";
import { ok, fail } from "@/lib/api";

const schema = z.object({
  items: z.array(z.object({ variantId: z.string().min(1), qty: z.number().int().min(1).max(10) })).min(1),
  couponCode: z.string().max(20).optional(),
  pincode: z.string().max(6).optional(),
  method: z.enum(["online", "cod"]).optional(),
});

export async function POST(req: Request) {
  const user = await requireUser(); // guests can ask for a quote too
  if (!user && !(await rateLimit(`quote:${clientIp(req)}`, 120, 600))) return fail("Too many requests. Try again shortly.", 429);
  const p = schema.safeParse(await req.json().catch(() => null));
  if (!p.success) return fail("Invalid input");

  try {
    const c = await priceCart(p.data.items, p.data.couponCode, user?.id ?? "", undefined, {
      method: p.data.method,
      pincode: p.data.pincode,
    });
    return ok({
      subtotal: c.subtotal,
      discount: c.discount,
      shipping: c.shipping,
      codFee: c.codFee,
      total: c.total,
      couponCode: c.coupon?.code ?? "",
      couponError: c.couponError,
      freeShippingAbove: c.s.freeShippingAbove,
      deliverable: c.pin.deliverable,
      codAvailable: c.codAvailable,
      codBlocked: c.codBlocked,
      codEnabled: c.s.codEnabled,
      codCharge: c.s.codFee,
    });
  } catch (e) {
    if (e instanceof UserError) return fail(e.message, 409);
    console.error(e);
    return fail("Could not calculate total", 500);
  }
}
