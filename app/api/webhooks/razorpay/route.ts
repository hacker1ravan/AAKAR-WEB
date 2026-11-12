import crypto from "crypto";
import { markOrderPaid } from "@/lib/orders";

// backup confirmation: still works if the customer pays and closes the tab
export async function POST(req: Request) {
  const raw = await req.text();
  const sig = Buffer.from(req.headers.get("x-razorpay-signature") ?? "");
  const expected = Buffer.from(
    crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET ?? "").update(raw).digest("hex")
  );
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected))
    return new Response("Bad signature", { status: 400 });

  const event = JSON.parse(raw);
  if (event.event === "payment.captured" || event.event === "order.paid") {
    const pay = event.payload.payment.entity;
    await markOrderPaid(pay.order_id, pay.id);
  }
  return new Response("ok");
}
