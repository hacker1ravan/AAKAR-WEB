import * as React from "react";
import { inr, fmtDate } from "../lib/format";
import { cld } from "../lib/img";

// react-email component for the customer order-status emails (confirmed / preparing /
// shipped / delivered / cancelled). Rendered to HTML by lib/orderEmail.tsx and sent
// through the existing Nodemailer transport. This is presentational only: it reproduces
// the previous hand-written email layout exactly — it never decides when or why mail is sent.

const isHttp = (u?: string | null): u is string => !!u && /^https?:\/\//i.test(u);
const orderNo = (id: string) => "#" + id.slice(-8).toUpperCase();

export type OrderItem = {
  name: string;
  size?: string | null;
  color?: string | null;
  quantity: number;
  price: number; // paise
  image?: string | null;
  productId?: string | null;
};

export type OrderLike = {
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
  items?: OrderItem[];
};

export type BrandSettings = {
  siteName?: string | null;
  siteUrl?: string | null;
  logoUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  tagline?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
};

export type OrderStatusEmailProps = {
  settings: BrandSettings;
  subject: string;
  orderId: string;
  preheader?: string;
  heading?: string;
  badge?: string;
  accent?: string;
  greeting: string;
  message: string;
  note?: string;
  tracking?: { courier?: string; number?: string; url?: string };
  invoiceAttached?: boolean;
  button?: { text: string; url: string };
  order?: OrderLike | null;
  showReview?: boolean;
};

const SEP = " · ";

const P: React.CSSProperties = { margin: "0 0 12px", fontSize: 15, lineHeight: 1.65, color: "#44403c" };
const metaLabel: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: ".3px",
  color: "#a8a29e",
  textTransform: "uppercase",
  fontWeight: 700,
  marginBottom: 6,
};

function Row({ label, value, bold, color }: { label: string; value: React.ReactNode; bold?: boolean; color?: string }) {
  return (
    <tr>
      <td style={{ padding: "5px 0", fontSize: 14, color: "#78716c" }}>{label}</td>
      <td align="right" style={{ padding: "5px 0", fontSize: 14, color: color || "#44403c", fontWeight: bold ? 700 : undefined }}>
        {value}
      </td>
    </tr>
  );
}

function OrderSummary({ order }: { order: OrderLike }) {
  const meta = [`Order ${orderNo(order.id)}`];
  if (order.createdAt) meta.push(fmtDate(order.createdAt));
  if (order.paymentMethod) meta.push(order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online");

  const items = order.items || [];

  const addr = [
    order.shippingName,
    order.shippingAddress,
    [order.shippingPincode, order.shippingState].filter(Boolean).join(", "),
    order.shippingPhone ? `Phone: ${order.shippingPhone}` : "",
  ].filter(Boolean) as string[];

  return (
    <>
      <div style={{ border: "1px solid #ebe7e1", borderRadius: 12, padding: "18px 18px 8px", margin: "4px 0 6px", background: "#fafaf9" }}>
        <div style={metaLabel}>{meta.join(SEP)}</div>
        {items.length > 0 && (
          <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: "collapse" }}>
            <tbody>
              {items.map((it, i) => {
                const variant = [it.size, it.color].filter(Boolean).map((v) => String(v)).join(" · ");
                return (
                  <tr key={i}>
                    <td width={56} valign="top" style={{ padding: "10px 0" }}>
                      {it.image ? (
                        <img
                          src={cld(it.image, 120)}
                          width={56}
                          height={56}
                          alt=""
                          style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", background: "#f4f3f1", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f4f3f1" }} />
                      )}
                    </td>
                    <td valign="top" style={{ padding: "10px 0 10px 14px" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#1c1917", lineHeight: 1.4 }}>{it.name}</div>
                      {variant && <div style={{ fontSize: 13, color: "#a8a29e", marginTop: 2 }}>{variant}</div>}
                      <div style={{ fontSize: 13, color: "#a8a29e", marginTop: 2 }}>Qty {Number(it.quantity) || 1}</div>
                    </td>
                    <td align="right" valign="top" style={{ padding: "10px 0", fontSize: 14, fontWeight: 600, color: "#1c1917", whiteSpace: "nowrap" }}>
                      {inr((it.price || 0) * (Number(it.quantity) || 1))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ height: 1, background: "#ebe7e1", margin: "8px 0 6px" }} />
        <table role="presentation" cellPadding={0} cellSpacing={0} width="100%" style={{ borderCollapse: "collapse" }}>
          <tbody>
            {order.subtotal != null && <Row label="Subtotal" value={inr(order.subtotal)} />}
            {!!order.discount && (
              <Row
                label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                value={"− " + inr(order.discount)}
                color="#16a34a"
              />
            )}
            {order.shipping != null && (
              <Row
                label="Shipping"
                value={order.shipping === 0 ? <span style={{ color: "#16a34a", fontWeight: 600 }}>Free</span> : inr(order.shipping)}
              />
            )}
            {!!order.codFee && <Row label="Cash on Delivery fee" value={inr(order.codFee)} />}
            <tr>
              <td colSpan={2} style={{ padding: "4px 0 0" }}>
                <div style={{ height: 1, background: "#ebe7e1", margin: "6px 0" }} />
              </td>
            </tr>
            <Row label="Total" value={inr(order.total)} bold color="#1c1917" />
          </tbody>
        </table>
      </div>
      {addr.length > 0 && (
        <div style={{ margin: "14px 0 4px" }}>
          <div style={metaLabel}>Shipping to</div>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "#44403c" }}>
            {addr.map((l, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {l}
              </React.Fragment>
            ))}
          </p>
        </div>
      )}
    </>
  );
}

function ReviewPrompt({ order, siteUrl }: { order: OrderLike; siteUrl: string }) {
  const base = isHttp(siteUrl) ? siteUrl.replace(/\/$/, "") : "";
  const first = order.items?.find((i) => i.productId);
  const link = base && first?.productId ? `${base}/products/${first.productId}#reviews` : base ? `${base}/orders/${order.id}` : "";
  return (
    <div style={{ border: "1px dashed #ebe7e1", borderRadius: 12, padding: "16px 18px", margin: "16px 0 4px", background: "#fafaf9" }}>
      <p style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: "#1c1917" }}>How did we do? ⭐</p>
      <p style={{ margin: `0 0 ${link ? "12px" : "0"}`, fontSize: 14, lineHeight: 1.6, color: "#78716c" }}>
        Your review helps other shoppers and helps us get better. It only takes a minute.
      </p>
      {link && (
        <a href={link} style={{ display: "inline-block", fontSize: 14, fontWeight: 600, color: "#1c1917", textDecoration: "underline" }}>
          Write a review →
        </a>
      )}
    </div>
  );
}

export function OrderStatusEmail(props: OrderStatusEmailProps) {
  const { settings: s, subject, order, note, tracking, invoiceAttached, showReview } = props;
  const brand = s.primaryColor || "#111111";
  const onBrand = s.secondaryColor || "#ffffff";
  const accent = props.accent || s.accentColor || "#e11d48";
  const siteName = s.siteName || "Our Store";
  const siteUrl = isHttp(s.siteUrl) ? s.siteUrl : "";
  const preheader = props.preheader || props.message || subject;

  // Intro paragraph lines, in the same order the previous plain template used.
  const intro: React.ReactNode[] = [props.greeting, props.message];
  if (note) intro.push(`Note: ${note}`);
  if (!order) intro.push(`Order: ${orderNo(props.orderId)}`);
  if (tracking?.number) {
    intro.push(`Courier: ${tracking.courier || "-"}`);
    intro.push(`Tracking number: ${tracking.number}`);
  }

  const btnUrl = props.button && isHttp(props.button.url) ? props.button.url : "";

  const social = [
    isHttp(s.instagramUrl) ? (
      <a key="ig" href={s.instagramUrl!} style={{ color: "#78716c", textDecoration: "underline" }}>
        Instagram
      </a>
    ) : null,
    isHttp(s.facebookUrl) ? (
      <a key="fb" href={s.facebookUrl!} style={{ color: "#78716c", textDecoration: "underline" }}>
        Facebook
      </a>
    ) : null,
  ].filter(Boolean) as React.ReactNode[];

  const contactBits = [s.contactEmail || "", s.contactPhone || ""].filter(Boolean) as string[];

  const css = `
  body{margin:0;padding:0;background:#f4f3f1;-webkit-text-size-adjust:100%}
  img{border:0;line-height:100%;outline:none;text-decoration:none}
  a{color:inherit}
  .wrap{width:100%;background:#f4f3f1}
  .card{width:600px;max-width:600px}
  @media only screen and (max-width:620px){
    .card{width:100% !important}
    .px{padding-left:20px !important;padding-right:20px !important}
    .hide-sm{display:none !important}
  }`;

  const header = s.logoUrl ? (
    <img src={cld(s.logoUrl, 400)} alt={siteName} height={40} style={{ display: "block", height: 40, width: "auto", border: 0, outline: "none" }} />
  ) : (
    <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: ".5px", color: onBrand, textDecoration: "none" }}>{siteName}</span>
  );

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        <title>{subject}</title>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body style={{ margin: 0, padding: 0, background: "#f4f3f1" }}>
        <span style={{ display: "none", maxHeight: 0, overflow: "hidden", opacity: 0, color: "#f4f3f1" }}>{preheader}</span>
        <table role="presentation" className="wrap" cellPadding={0} cellSpacing={0} width="100%">
          <tbody>
            <tr>
              <td align="center" style={{ padding: "28px 12px" }}>
                <table
                  role="presentation"
                  className="card"
                  cellPadding={0}
                  cellSpacing={0}
                  style={{ background: "#ffffff", borderRadius: 14, overflow: "hidden", border: "1px solid #ebe7e1" }}
                >
                  <tbody>
                    <tr>
                      <td className="px" align="left" style={{ background: brand, padding: "22px 32px" }}>
                        {siteUrl ? (
                          <a href={siteUrl} style={{ textDecoration: "none" }}>
                            {header}
                          </a>
                        ) : (
                          header
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px" style={{ padding: "30px 32px 10px" }}>
                        {props.badge && (
                          <>
                            <span
                              style={{
                                display: "inline-block",
                                margin: "0 0 14px",
                                padding: "5px 12px",
                                borderRadius: 999,
                                background: accent,
                                color: "#ffffff",
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: ".4px",
                                textTransform: "uppercase",
                              }}
                            >
                              {props.badge}
                            </span>
                            <br />
                          </>
                        )}
                        {props.heading && (
                          <h1 style={{ margin: "0 0 6px", fontSize: 22, lineHeight: 1.3, color: "#1c1917", fontWeight: 700 }}>{props.heading}</h1>
                        )}
                        {intro.map((l, i) => (
                          <p key={i} style={P}>
                            {l}
                          </p>
                        ))}
                        {isHttp(tracking?.url) && (
                          <p style={P}>
                            Track your parcel:{" "}
                            <a href={tracking!.url} style={{ color: "#44403c", fontWeight: 600 }}>
                              {tracking!.url}
                            </a>
                          </p>
                        )}
                        {invoiceAttached && <p style={P}>Your invoice is attached.</p>}
                      </td>
                    </tr>
                    {order && (
                      <tr>
                        <td className="px" style={{ padding: "4px 32px 0" }}>
                          <OrderSummary order={order} />
                          {showReview && <ReviewPrompt order={order} siteUrl={siteUrl} />}
                        </td>
                      </tr>
                    )}
                    {btnUrl && (
                      <tr>
                        <td className="px" style={{ padding: "0 32px 10px" }}>
                          <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "22px 0 6px" }}>
                            <tbody>
                              <tr>
                                <td style={{ borderRadius: 8, background: brand }}>
                                  <a
                                    href={btnUrl}
                                    style={{
                                      display: "inline-block",
                                      padding: "13px 26px",
                                      fontSize: 15,
                                      fontWeight: 600,
                                      color: onBrand,
                                      textDecoration: "none",
                                      borderRadius: 8,
                                    }}
                                  >
                                    {props.button!.text}
                                  </a>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td className="px" style={{ padding: "22px 32px 30px" }}>
                        <div style={{ height: 1, background: "#ebe7e1", margin: "0 0 18px" }} />
                        <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.6, color: "#78716c" }}>
                          {siteUrl ? (
                            <a href={siteUrl} style={{ color: "#44403c", fontWeight: 600, textDecoration: "none" }}>
                              {siteName}
                            </a>
                          ) : (
                            <strong style={{ color: "#44403c" }}>{siteName}</strong>
                          )}
                          {s.tagline ? ` — ${s.tagline}` : ""}
                        </p>
                        {contactBits.length > 0 && (
                          <p style={{ margin: "0 0 4px", fontSize: 12, lineHeight: 1.6, color: "#a8a29e" }}>{contactBits.join(SEP)}</p>
                        )}
                        {s.address && <p style={{ margin: "0 0 4px", fontSize: 12, lineHeight: 1.6, color: "#a8a29e" }}>{s.address}</p>}
                        {social.length > 0 && (
                          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#a8a29e" }}>
                            {social.map((node, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && SEP}
                                {node}
                              </React.Fragment>
                            ))}
                          </p>
                        )}
                        <p style={{ margin: "12px 0 0", fontSize: 11, lineHeight: 1.5, color: "#c4bfb8" }}>
                          You are receiving this email because you placed an order or created an account with us.
                        </p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}

export default OrderStatusEmail;
