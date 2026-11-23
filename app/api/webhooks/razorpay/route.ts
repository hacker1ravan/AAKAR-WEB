import crypto from "crypto";
import { markOrderPaid } from "@/lib/orders";

// backup confirmation: still works if the customer pays and closes the tab
export async function POST(req: Request) {
  const raw = await req.text();
  // Refuse rather than validate against an empty-key HMAC if the webhook secret is missing.
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 500 });

  const sig = Buffer.from(req.headers.get("x-razorpay-signature") ?? "");
  const expected = Buffer.from(
    crypto.createHmac("sha256", secret).update(raw).digest("hex")
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
