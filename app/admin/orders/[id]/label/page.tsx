import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { stateName } from "@/lib/gst";
import { inr } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const metadata = { title: "Shipping label", robots: { index: false } };

// A 100 x 150 mm label to print and stick on the parcel
export default async function Label({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, s] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    getSettings(),
  ]);
  if (!order) notFound();
  const cod = order.paymentMethod === "cod";

  return (
    <main className="max-w-sm mx-auto p-4 text-sm space-y-3 print:p-0 print:max-w-none">
      <style>{`@page { size: 100mm 150mm; margin: 4mm; }`}</style>
      <div className="border-2 border-black p-3 space-y-3">
        <div>
          <p className="text-xs">From</p>
          <p className="font-semibold">{s.siteName}</p>
          {s.address && <p className="whitespace-pre-line">{s.address}</p>}
          {s.contactPhone && <p>{s.contactPhone}</p>}
        </div>
        <div className="border-t-2 border-black pt-3">
          <p className="text-xs">Ship to</p>
          <p className="text-lg font-bold">{order.shippingName}</p>
          <p className="whitespace-pre-line">{order.shippingAddress}</p>
          <p>{stateName(order.shippingState)} · PIN <b className="text-base">{order.shippingPincode}</b></p>
          <p>Phone: {order.shippingPhone}</p>
        </div>
        <div className={`border-2 border-black p-2 text-center font-bold ${cod ? "text-xl" : ""}`}>
          {cod ? `Cash on Delivery: collect ${inr(order.total)}` : "Prepaid: do not collect cash"}
        </div>
        <div className="border-t-2 border-black pt-2 space-y-1">
          <p>Order #{order.id.slice(-8).toUpperCase()}{order.trackingNumber && ` · ${order.courier || "Courier"} ${order.trackingNumber}`}</p>
          {order.items.map((i) => (
            <p key={i.id}>{i.quantity} x {i.name} ({i.color}, {i.size})</p>
          ))}
        </div>
      </div>
      <PrintButton label="Print label" />
    </main>
  );
}
