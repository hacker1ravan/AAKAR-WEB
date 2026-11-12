import { prisma } from "./prisma";
import { getSettings } from "./settings";
import { gstinState, normState, stateName } from "./gst";

type Item = { name: string; size: string; color: string; price: number; quantity: number; gstRate: number; hsnCode?: string };

// Prices are GST-inclusive, so work backwards to the taxable value.
const split = (net: number, rate: number) => {
  const taxable = Math.round((net * 100) / (100 + rate));
  return { taxable, tax: net - taxable };
};

// Same state as the seller: half CGST and half SGST. Another state: IGST.
const taxSplit = (tax: number, intra: boolean) => {
  const cgst = intra ? Math.round(tax / 2) : 0;
  return { cgst, sgst: intra ? tax - cgst : 0, igst: intra ? 0 : tax };
};

export function buildInvoice(
  order: { items: Item[]; discount: number; shipping: number; codFee: number },
  feeRate: number,
  intra = false
) {
  const gross = order.items.reduce((n, i) => n + i.price * i.quantity, 0);
  let left = order.discount;
  const last = order.items.length - 1;

  const lines = order.items.map((i, idx) => {
    const g = i.price * i.quantity;
    const share = idx === last ? left : gross ? Math.round((order.discount * g) / gross) : 0;
    left -= share;
    const net = g - share;
    const t = split(net, i.gstRate);
    return {
      ...i, net, ...t, ...taxSplit(t.tax, intra), rate: i.gstRate,
      hsn: i.hsnCode ?? "", label: `${i.name} (${i.color}, ${i.size})`,
    };
  });

  const fees = (
    [
      ["Shipping", order.shipping],
      ["Cash on Delivery fee", order.codFee],
    ] as [string, number][]
  )
    .filter(([, amt]) => amt > 0)
    .map(([label, amt]) => {
      const t = split(amt, feeRate);
      return { label, quantity: 1, rate: feeRate, net: amt, hsn: "", ...t, ...taxSplit(t.tax, intra) };
    });

  const summary = new Map<number, { taxable: number; tax: number; cgst: number; sgst: number; igst: number }>();
  for (const l of [...lines, ...fees]) {
    const s = summary.get(l.rate) ?? { taxable: 0, tax: 0, cgst: 0, sgst: 0, igst: 0 };
    s.taxable += l.taxable;
    s.tax += l.tax;
    s.cgst += l.cgst;
    s.sgst += l.sgst;
    s.igst += l.igst;
    summary.set(l.rate, s);
  }
  return { lines, fees, summary: [...summary].sort((a, b) => a[0] - b[0]) };
}

// Everything the invoice page, the PDF and the email need. Returns null while the order is unpaid or cancelled.
export async function getInvoice(orderId: string) {
  const [order, s] = await Promise.all([
    prisma.order.findUnique({ where: { id: orderId }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order || ["pending", "cancelled"].includes(order.status)) return null;

  const gst = !!s.gstin;
  const sellerState = gstinState(s.gstin);
  const intra = !!sellerState && !!order.shippingState && normState(sellerState) === normState(order.shippingState);
  const inv = buildInvoice(order, s.gstOnShipping, intra);
  const no = `${s.invoicePrefix}${String(order.invoiceNo).padStart(5, "0")}`;
  return { order, s, inv, no, gst, intra, placeOfSupply: stateName(order.shippingState) };
}

export type InvoiceData = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
