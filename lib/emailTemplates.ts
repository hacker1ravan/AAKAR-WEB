import { esc } from "./mailer";
import { cld } from "./img";
import { inr, fmtDate } from "./format";

// Pure, presentational HTML builders for the order emails. No business logic —
// these only turn an order we already have into a nicely formatted email body.

type Item = {
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number; // paise
  image?: string | null;
  productId?: string | null;
};

type OrderLike = {
  id: string;
  createdAt?: Date | string;
  paymentMethod?: string;
  subtotal?: number;
  shipping?: number;
  discount?: number;
  codFee?: number;
  total: number;
  couponCode?: string;
  shippingName?: string;
  shippingPhone?: string;
  shippingPincode?: string;
  shippingState?: string;
  shippingAddress?: string;
  items?: Item[];
};

const orderNo = (id: string) => "#" + id.slice(-8).toUpperCase();

const row = (label: string, value: string, opts: { bold?: boolean; color?: string } = {}) => `
  <tr>
    <td style="padding:5px 0;font-size:14px;color:#78716c">${esc(label)}</td>
    <td align="right" style="padding:5px 0;font-size:14px;color:${opts.color || "#44403c"};${opts.bold ? "font-weight:700" : ""}">${value}</td>
  </tr>`;

function itemsTable(items: Item[]) {
  const rows = items.map((it) => {
    const thumb = it.image
      ? `<img src="${esc(cld(it.image, 120))}" width="56" height="56" alt="" style="width:56px;height:56px;border-radius:8px;object-fit:cover;background:#f4f3f1;display:block">`
      : `<div style="width:56px;height:56px;border-radius:8px;background:#f4f3f1"></div>`;
    const variant = [it.size, it.color].filter(Boolean).map((v) => esc(String(v))).join(" · ");
    return `
      <tr>
        <td width="56" style="padding:10px 0" valign="top">${thumb}</td>
        <td style="padding:10px 0 10px 14px" valign="top">
          <div style="font-size:14px;font-weight:600;color:#1c1917;line-height:1.4">${esc(it.name)}</div>
          ${variant ? `<div style="font-size:13px;color:#a8a29e;margin-top:2px">${variant}</div>` : ""}
          <div style="font-size:13px;color:#a8a29e;margin-top:2px">Qty ${Number(it.quantity) || 1}</div>
        </td>
        <td align="right" valign="top" style="padding:10px 0;font-size:14px;font-weight:600;color:#1c1917;white-space:nowrap">${inr((it.price || 0) * (Number(it.quantity) || 1))}</td>
      </tr>`;
  }).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">${rows}</table>`;
}

// The full order summary block: meta, items, totals and shipping address.
export function orderSummaryHtml(order: OrderLike): string {
  const meta: string[] = [`Order ${orderNo(order.id)}`];
  if (order.createdAt) meta.push(fmtDate(order.createdAt));
  if (order.paymentMethod) meta.push(order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online");

  const shippingLabel = order.shipping === 0 ? `<span style="color:#16a34a;font-weight:600">Free</span>` : inr(order.shipping || 0);

  const totals = [
    order.subtotal != null ? row("Subtotal", inr(order.subtotal)) : "",
    order.discount ? row(`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, "− " + inr(order.discount), { color: "#16a34a" }) : "",
    order.shipping != null ? row("Shipping", shippingLabel) : "",
    order.codFee ? row("Cash on Delivery fee", inr(order.codFee)) : "",
  ].filter(Boolean).join("");

  const addr = [
    order.shippingName,
    order.shippingAddress,
    [order.shippingPincode, order.shippingState].filter(Boolean).join(", "),
    order.shippingPhone ? `Phone: ${order.shippingPhone}` : "",
  ].filter(Boolean).map((l) => esc(String(l))).join("<br>");

  return `
  <div style="border:1px solid #ebe7e1;border-radius:12px;padding:18px 18px 8px;margin:4px 0 6px;background:#fafaf9">
    <div style="font-size:12px;letter-spacing:.3px;color:#a8a29e;text-transform:uppercase;font-weight:700;margin-bottom:6px">${meta.map(esc).join(" &nbsp;·&nbsp; ")}</div>
    ${order.items && order.items.length ? itemsTable(order.items) : ""}
    <div style="height:1px;background:#ebe7e1;margin:8px 0 6px"></div>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
      ${totals}
      <tr><td colspan="2" style="padding:4px 0 0"><div style="height:1px;background:#ebe7e1;margin:6px 0"></div></td></tr>
      ${row("Total", inr(order.total), { bold: true, color: "#1c1917" })}
    </table>
  </div>
  ${addr ? `
  <div style="margin:14px 0 4px">
    <div style="font-size:12px;letter-spacing:.3px;color:#a8a29e;text-transform:uppercase;font-weight:700;margin-bottom:6px">Shipping to</div>
    <p style="margin:0;font-size:14px;line-height:1.6;color:#44403c">${addr}</p>
  </div>` : ""}`;
}

// A friendly "leave a review" prompt for the delivered email.
export function reviewPromptHtml(order: OrderLike, siteUrl: string): string {
  const base = /^https?:\/\//.test(siteUrl) ? siteUrl.replace(/\/$/, "") : "";
  const first = order.items?.find((i) => i.productId);
  const link = base && first?.productId ? `${base}/products/${first.productId}#reviews` : base ? `${base}/orders/${order.id}` : "";
  return `
  <div style="border:1px dashed #ebe7e1;border-radius:12px;padding:16px 18px;margin:16px 0 4px;background:#fafaf9">
    <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1c1917">How did we do? ⭐</p>
    <p style="margin:0 0 ${link ? "12px" : "0"};font-size:14px;line-height:1.6;color:#78716c">Your review helps other shoppers and helps us get better. It only takes a minute.</p>
    ${link ? `<a href="${esc(link)}" style="display:inline-block;font-size:14px;font-weight:600;color:#1c1917;text-decoration:underline">Write a review →</a>` : ""}
  </div>`;
}
