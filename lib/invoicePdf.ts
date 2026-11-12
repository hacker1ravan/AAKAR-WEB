import PDFDocument from "pdfkit";
import type { InvoiceData } from "./invoice";
import { fmtDate } from "./format";

const money = (p: number) =>
  "Rs. " + (p / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// The built-in PDF fonts only cover Latin letters, so anything else is shown as "?" (the web invoice shows it fully).
const safe = (s: string) => s.replace(/[^\x20-\x7E\u00A0-\u00FF]/g, "?");

type Col = { title: string; w: number; right?: boolean; get: (r: any) => string };

export function invoicePdf(d: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const { order, s, inv, no, gst, intra, placeOfSupply } = d;
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const L = 40, W = 515;

    // header: seller on the left, invoice details on the right
    doc.font("Helvetica-Bold").fontSize(16).text(safe(s.siteName), L, 40, { width: 280 });
    doc.font("Helvetica").fontSize(9);
    for (const line of [s.address, s.contactPhone, s.contactEmail, gst ? `GSTIN: ${s.gstin}` : ""].filter(Boolean))
      doc.text(safe(line), L, doc.y, { width: 280 });
    const leftEnd = doc.y;

    doc.font("Helvetica-Bold").fontSize(14).text(gst ? "Tax Invoice" : "Invoice", 340, 40, { width: 215, align: "right" });
    doc.font("Helvetica").fontSize(9);
    for (const line of [
      `No: ${no}`,
      `Date: ${fmtDate(order.createdAt)}`,
      `Order: #${order.id.slice(-8).toUpperCase()}`,
      `Payment: ${order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online"}`,
      ...(gst && placeOfSupply ? [`Place of supply: ${placeOfSupply}`] : []),
    ])
      doc.text(safe(line), 340, doc.y, { width: 215, align: "right" });

    let y = Math.max(leftEnd, doc.y) + 18;
    doc.font("Helvetica-Bold").fontSize(10).text("Bill to / Ship to", L, y);
    doc.font("Helvetica").fontSize(9);
    doc.text(safe(`${order.shippingName}  ${order.shippingPhone}`), L, doc.y, { width: 300 });
    doc.text(safe(order.shippingAddress), L, doc.y, { width: 300 });
    doc.text(`PIN ${order.shippingPincode}`, L, doc.y, { width: 300 });
    y = doc.y + 16;

    // table
    const cols: Col[] = gst
      ? intra
        ? [
            { title: "Item", w: 150, get: (r) => r.label },
            { title: "HSN", w: 45, get: (r) => r.hsn },
            { title: "Qty", w: 28, right: true, get: (r) => String(r.quantity) },
            { title: "Taxable", w: 62, right: true, get: (r) => money(r.taxable) },
            { title: "GST%", w: 30, right: true, get: (r) => `${r.rate}%` },
            { title: "CGST", w: 55, right: true, get: (r) => money(r.cgst) },
            { title: "SGST", w: 55, right: true, get: (r) => money(r.sgst) },
            { title: "Amount", w: 90, right: true, get: (r) => money(r.net) },
          ]
        : [
            { title: "Item", w: 175, get: (r) => r.label },
            { title: "HSN", w: 45, get: (r) => r.hsn },
            { title: "Qty", w: 28, right: true, get: (r) => String(r.quantity) },
            { title: "Taxable", w: 65, right: true, get: (r) => money(r.taxable) },
            { title: "GST%", w: 32, right: true, get: (r) => `${r.rate}%` },
            { title: "IGST", w: 65, right: true, get: (r) => money(r.igst) },
            { title: "Amount", w: 105, right: true, get: (r) => money(r.net) },
          ]
      : [
          { title: "Item", w: 335, get: (r) => r.label },
          { title: "Qty", w: 40, right: true, get: (r) => String(r.quantity) },
          { title: "Amount", w: 140, right: true, get: (r) => money(r.net) },
        ];

    const drawRow = (r: any | null, bold: boolean) => {
      if (y > 760) { doc.addPage(); y = 40; }
      if (bold) doc.rect(L, y - 3, W, 16).fill("#eeeeee").fillColor("black");
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(8);
      let x = L;
      for (const c of cols) {
        doc.text(safe(r ? c.get(r) : c.title), x + 2, y, { width: c.w - 4, align: c.right ? "right" : "left", lineBreak: false, ellipsis: true });
        x += c.w;
      }
      y += 16;
    };
    drawRow(null, true);
    for (const r of [...inv.lines, ...inv.fees]) drawRow(r, false);
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor("#999999").stroke().strokeColor("black");
    y += 10;

    // totals
    const total = (label: string, value: string, bold = false) => {
      if (y > 780) { doc.addPage(); y = 40; }
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 11 : 9);
      doc.text(safe(label), 320, y, { width: 130, lineBreak: false });
      doc.text(value, 450, y, { width: 105, align: "right", lineBreak: false });
      y += bold ? 18 : 14;
    };
    total("Items subtotal", money(order.subtotal));
    if (order.discount > 0) total(`Discount (${order.couponCode})`, "-" + money(order.discount));
    if (gst)
      for (const [rate, v] of inv.summary) {
        if (intra) {
          total(`CGST @ ${rate / 2}% (included)`, money(v.cgst));
          total(`SGST @ ${rate / 2}% (included)`, money(v.sgst));
        } else total(`IGST @ ${rate}% (included)`, money(v.igst));
      }
    total("Total", money(order.total), true);

    y += 10;
    doc.font("Helvetica").fontSize(8).text(`${gst ? "All prices include GST. " : ""}This is a computer generated invoice.`, L, y, { width: W });
    doc.end();
  });
}
