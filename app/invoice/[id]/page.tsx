import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInvoice } from "@/lib/invoice";
import { canAccessOrder } from "@/lib/orderAccess";
import { inr } from "@/lib/format";
import { cld } from "@/lib/img";
import PrintButton from "./PrintButton";
import { fmtDate } from "@/lib/format";

export const metadata = { title: "Invoice", robots: { index: false } };

export default async function Invoice({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string }> }) {
  const { id } = await params;
  const { t } = await searchParams;

  const base = await prisma.order.findUnique({ where: { id }, select: { userId: true, accessToken: true } });
  if (!base) notFound();
  if (!(await canAccessOrder(base, t))) {
    if (!(await getServerSession(authOptions))) redirect(`/login?next=/invoice/${id}`);
    notFound();
  }

  const d = await getInvoice(id);
  if (!d) notFound();
  const { order, s, inv, no, gst, intra, placeOfSupply } = d;

  const th = "p-2 text-left";
  const td = "p-2";
  const rows = [...inv.lines, ...inv.fees];
  const pdfHref = `/invoice/${id}/pdf${t ? `?t=${encodeURIComponent(t)}` : ""}`;

  return (
    <main className="max-w-3xl mx-auto p-6 text-sm space-y-4 bg-white text-black">
      <div className="flex justify-between gap-4">
        <div>
          {s.logoUrl && <img src={cld(s.logoUrl, 400)} alt="" className="h-10 w-auto mb-1" />}
          <h1 className="text-xl font-bold">{s.siteName}</h1>
          {s.address && <p className="whitespace-pre-line">{s.address}</p>}
          {s.contactPhone && <p>{s.contactPhone}</p>}
          {s.contactEmail && <p>{s.contactEmail}</p>}
          {gst && <p>GSTIN: {s.gstin}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{gst ? "Tax Invoice" : "Invoice"}</p>
          <p>No: {no}</p>
          <p>Date: {fmtDate(order.createdAt)}</p>
          <p>Order: #{order.id.slice(-8).toUpperCase()}</p>
          <p>Payment: {order.paymentMethod === "cod" ? "Cash on Delivery" : "Paid online"}</p>
          {gst && placeOfSupply && <p>Place of supply: {placeOfSupply}</p>}
        </div>
      </div>

      <div>
        <p className="font-semibold">Bill to / Ship to</p>
        <p>{order.shippingName} · {order.shippingPhone}</p>
        <p className="whitespace-pre-line">{order.shippingAddress}</p>
        <p>PIN {order.shippingPincode}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border">
          <thead className="bg-gray-100">
            <tr>
              <th className={th}>Item</th>
              {gst && <th className={th}>HSN</th>}
              <th className={th}>Qty</th>
              {gst && <th className={th}>Taxable</th>}
              {gst && <th className={th}>GST %</th>}
              {gst && intra && <th className={th}>CGST</th>}
              {gst && intra && <th className={th}>SGST</th>}
              {gst && !intra && <th className={th}>IGST</th>}
              <th className={th}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l, i) => (
              <tr key={i} className="border-t">
                <td className={td}>{"label" in l ? l.label : ""}</td>
                {gst && <td className={td}>{l.hsn || "-"}</td>}
                <td className={td}>{l.quantity}</td>
                {gst && <td className={td}>{inr(l.taxable)}</td>}
                {gst && <td className={td}>{l.rate}%</td>}
                {gst && intra && <td className={td}>{inr(l.cgst)}</td>}
                {gst && intra && <td className={td}>{inr(l.sgst)}</td>}
                {gst && !intra && <td className={td}>{inr(l.igst)}</td>}
                <td className={td}>{inr(l.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="ml-auto max-w-xs space-y-1">
        <p className="flex justify-between"><span>Items subtotal</span><span>{inr(order.subtotal)}</span></p>
        {order.discount > 0 && (
          <p className="flex justify-between"><span>Discount ({order.couponCode})</span><span>-{inr(order.discount)}</span></p>
        )}
        {gst && inv.summary.map(([rate, v]) =>
          intra ? (
            <div key={rate} className="text-xs space-y-1">
              <p className="flex justify-between"><span>CGST @ {rate / 2}% (included)</span><span>{inr(v.cgst)}</span></p>
              <p className="flex justify-between"><span>SGST @ {rate / 2}% (included)</span><span>{inr(v.sgst)}</span></p>
            </div>
          ) : (
            <p key={rate} className="flex justify-between text-xs"><span>IGST @ {rate}% (included)</span><span>{inr(v.igst)}</span></p>
          )
        )}
        <p className="flex justify-between font-semibold text-base border-t pt-1"><span>Total</span><span>{inr(order.total)}</span></p>
      </div>

      <p className="text-xs">{gst ? "All prices include GST. " : ""}This is a computer generated invoice.</p>
      <div className="flex gap-3 items-center print:hidden">
        <PrintButton />
        <Link href={pdfHref} className="border rounded px-4 py-2">Download PDF</Link>
      </div>
    </main>
  );
}
