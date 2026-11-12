import crypto from "crypto";
import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (expected !== razorpay_signature)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  await markOrderPaid(razorpay_order_id, razorpay_payment_id);
  return NextResponse.json({ success: true });
}
