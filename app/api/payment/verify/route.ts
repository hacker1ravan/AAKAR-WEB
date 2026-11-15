import crypto from "crypto";
import { NextResponse } from "next/server";
import { markOrderPaid } from "@/lib/orders";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const razorpay_order_id = body?.razorpay_order_id;
  const razorpay_payment_id = body?.razorpay_payment_id;
  const razorpay_signature = body?.razorpay_signature;
  if (
    typeof razorpay_order_id !== "string" ||
    typeof razorpay_payment_id !== "string" ||
    typeof razorpay_signature !== "string"
  )
    return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });

  const expected = Buffer.from(
    crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET ?? "")
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")
  );
  const given = Buffer.from(razorpay_signature);
  // constant-time compare, like the webhook route, so the signature cannot be guessed by timing
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected))
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  await markOrderPaid(razorpay_order_id, razorpay_payment_id);
  return NextResponse.json({ success: true });
}
