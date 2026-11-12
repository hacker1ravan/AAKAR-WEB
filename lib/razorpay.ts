import Razorpay from "razorpay";

let client: Razorpay | null = null;

// Created on first use, so the site still starts (and builds) before you add your Razorpay keys.
export function razorpay() {
  if (!client) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    if (!key_id || !key_secret)
      throw new Error("Razorpay keys are missing. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env");
    client = new Razorpay({ key_id, key_secret });
  }
  return client;
}
