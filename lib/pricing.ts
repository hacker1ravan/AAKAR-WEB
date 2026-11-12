import type { Coupon, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { inr } from "./format";

export class UserError extends Error {}

const bad = (error: string) => ({ ok: false as const, error });

export function shippingFor(
  subtotal: number,
  s: { shippingFlatRate: number; freeShippingAbove: number }
) {
  if (s.freeShippingAbove > 0 && subtotal >= s.freeShippingAbove) return 0;
  return s.shippingFlatRate;
}

export async function evaluateCoupon(
  rawCode: string,
  subtotal: number,
  userId: string,
  db: Prisma.TransactionClient = prisma
) {
  const c = await db.coupon.findUnique({ where: { code: rawCode.trim().toUpperCase() } });
  if (!c || !c.active) return bad("Invalid coupon code");
  if (c.expiresAt && c.expiresAt < new Date()) return bad("This coupon has expired");
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return bad("This coupon is fully used");
  if (subtotal < c.minOrder) return bad(`Add items worth ${inr(c.minOrder)} or more to use this coupon`);
  if (c.perUserLimit > 0) {
    const used = await db.order.count({
      where: { userId, couponCode: c.code, status: { not: "cancelled" } },
    });
    if (used >= c.perUserLimit) return bad("You have already used this coupon");
  }
  let discount = c.type === "percent" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.type === "percent" && c.maxDiscount > 0) discount = Math.min(discount, c.maxDiscount);
  discount = Math.min(discount, Math.max(0, subtotal - 100)); // Razorpay needs at least ₹1
  return { ok: true as const, coupon: c, discount };
}

export function parsePins(text: string) {
  return new Set(text.split(/[\s,;]+/).filter((p) => /^[1-9]\d{5}$/.test(p)));
}

export function pinInfo(
  pin: string | undefined,
  s: { deliveryPincodes: string; codEnabled: boolean; codPincodes: string }
) {
  const valid = !!pin && /^[1-9]\d{5}$/.test(pin);
  const all = parsePins(s.deliveryPincodes);
  const cod = parsePins(s.codPincodes);
  const deliverable = valid && (all.size === 0 || all.has(pin!));
  const codAllowed = deliverable && s.codEnabled && (cod.size === 0 || cod.has(pin!));
  return { valid, deliverable, codAllowed };
}

// One place that calculates subtotal, coupon, shipping, COD fee and total. Prices always come from the database.
export async function priceCart(
  items: { variantId: string; qty: number }[],
  couponCode: string | undefined,
  userId: string,
  db: Prisma.TransactionClient = prisma,
  opts: { method?: "online" | "cod"; pincode?: string } = {}
) {
  const qtyById = new Map<string, number>();
  for (const i of items) qtyById.set(i.variantId, (qtyById.get(i.variantId) ?? 0) + i.qty);

  const variants = await db.variant.findMany({
    where: { id: { in: [...qtyById.keys()] } },
    include: { product: true },
  });
  if (variants.length !== qtyById.size)
    throw new UserError("Some items are no longer available. Please refresh your cart.");
  const hidden = variants.find((v) => !v.product.active);
  if (hidden) throw new UserError(`${hidden.product.name} is no longer available. Please refresh your cart.`);

  const lines = variants.map((variant) => ({ variant, qty: qtyById.get(variant.id)! }));
  const subtotal = lines.reduce((n, l) => n + l.variant.product.price * l.qty, 0);

  const cats = await db.category.findMany({
    where: { name: { in: [...new Set(variants.map((v) => v.product.category))] } },
  });
  const catCod = new Map(cats.map((c) => [c.name, c.codAvailable]));
  const codBlocked = [
    ...new Set(
      lines
        .filter((l) => !l.variant.product.codAvailable || catCod.get(l.variant.product.category) === false)
        .map((l) => l.variant.product.name)
    ),
  ];

  const s = await getSettings();
  const shipping = shippingFor(subtotal, s);

  let discount = 0;
  let coupon: Coupon | null = null;
  let couponError = "";
  if (couponCode?.trim()) {
    const r = await evaluateCoupon(couponCode, subtotal, userId, db);
    if (r.ok) {
      discount = r.discount;
      coupon = r.coupon;
    } else couponError = r.error;
  }

  const before = subtotal - discount + shipping;
  const pin = pinInfo(opts.pincode, s);
  const codAvailable =
    pin.codAllowed && codBlocked.length === 0 && !(s.codMaxOrder > 0 && before > s.codMaxOrder);
  const codFee = opts.method === "cod" && codAvailable ? s.codFee : 0;

  return {
    lines, subtotal, shipping, discount, coupon, couponError,
    pin, codAvailable, codFee, codBlocked, total: before + codFee, s,
  };
}
