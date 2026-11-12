import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { inr } from "@/lib/format";
import Photo from "./Photo";
import ReturnForm from "./ReturnForm";
import OrderActions from "./OrderActions";
import { fmtDateTime } from "@/lib/format";

type Order = Prisma.OrderGetPayload<{ include: { items: true; events: true; returns: true } }>;

// The order page, shared by logged-in customers (/orders/[id]) and guests (/track/[token]).
export default function OrderView({
  order, returnWindowDays, invoiceHref, guestEmail, guestToken,
}: { order: Order; returnWindowDays: number; invoiceHref: string; guestEmail?: string; guestToken?: string }) {
  const canPay = order.status === "pending" && order.paymentMethod === "online";
  const canCancel = canPay || (order.status === "processing" && order.paymentMethod === "cod");
  const days = order.deliveredAt ? (Date.now() - order.deliveredAt.getTime()) / 86400000 : null;
  const canReturn =
    order.status === "delivered" && days !== null && days <= returnWindowDays && !order.returns.length;
  const ret = order.returns[0];

  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Order #{order.id.slice(-8).toUpperCase()}</h1>
      <p>Status: <b className="capitalize">{order.status}</b> · Total {inr(order.total)}</p>
      {canCancel && (
        <OrderActions orderId={order.id} accessToken={guestToken} canPay={canPay} amountLabel={inr(order.total)} />
      )}
      {!["pending", "cancelled"].includes(order.status) && (
        <Link href={invoiceHref} target="_blank" className="underline text-sm">Download invoice</Link>
      )}

      <ul className="space-y-2">
        {order.items.map((i) => (
          <li key={i.id} className="flex gap-3 text-sm">
            <Photo src={i.image} alt="" width={96} className="w-12 h-14 object-cover rounded" />
            <div><p>{i.name}</p><p>{i.color} · {i.size} · Qty {i.quantity}</p></div>
          </li>
        ))}
      </ul>

      {order.subtotal > 0 && (
        <div className="border rounded p-3 text-sm space-y-1">
          <p className="flex justify-between"><span>Subtotal</span><span>{inr(order.subtotal)}</span></p>
          {order.discount > 0 && (
            <p className="flex justify-between"><span>Discount ({order.couponCode})</span><span>-{inr(order.discount)}</span></p>
          )}
          <p className="flex justify-between"><span>Shipping</span><span>{order.shipping ? inr(order.shipping) : "Free"}</span></p>
          {order.codFee > 0 && <p className="flex justify-between"><span>COD fee</span><span>{inr(order.codFee)}</span></p>}
        </div>
      )}
      {order.paymentMethod === "cod" && order.status !== "cancelled" && (
        <p className="text-sm">Cash on Delivery: please pay {inr(order.total)} when your order arrives.</p>
      )}

      {order.trackingNumber && (
        <div className="border rounded p-3 text-sm">
          <p>Courier: {order.courier || "-"}</p>
          <p>Tracking number: {order.trackingNumber}</p>
          {order.trackingUrl && /^https?:\/\//.test(order.trackingUrl) && (
            <a className="underline" href={order.trackingUrl} target="_blank" rel="noopener noreferrer">
              Track on courier site
            </a>
          )}
        </div>
      )}

      <ol className="border-l-2 pl-4 space-y-3">
        {order.events.map((e) => (
          <li key={e.id}>
            <p className="font-medium capitalize">{e.status}</p>
            <p className="text-xs">{fmtDateTime(e.createdAt)}</p>
            {e.note && <p className="text-sm">{e.note}</p>}
          </li>
        ))}
      </ol>

      {ret && (
        <p className="border rounded p-3 text-sm">
          Return status: <b className="capitalize">{ret.status}</b>
          {ret.adminNote && ` · ${ret.adminNote}`}
        </p>
      )}
      {canReturn && !guestEmail && <ReturnForm orderId={order.id} />}
      {canReturn && guestEmail && (
        <p className="border rounded p-3 text-sm">
          To request a return,{" "}
          <Link href={`/register?email=${encodeURIComponent(guestEmail)}`} className="underline">create an account</Link>{" "}
          with {guestEmail}. This order will appear in it once you confirm your email.
        </p>
      )}
      <Link href="/return-policy" className="underline text-sm">Return policy</Link>
    </main>
  );
}
