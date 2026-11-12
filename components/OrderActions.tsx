"use client";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { api } from "@/lib/fetcher";
import { useAction } from "@/lib/hooks";

declare global { interface Window { Razorpay: any } }

// "Pay now" for an unpaid online order, and "Cancel order" while it can still be cancelled.
export default function OrderActions({
  orderId, accessToken, canPay, amountLabel,
}: { orderId: string; accessToken?: string; canPay: boolean; amountLabel: string }) {
  const router = useRouter();
  const { run, loading, msg } = useAction();

  const pay = () =>
    run(async () => {
      if (!window.Razorpay) throw new Error("Payment window is still loading. Try again in a moment.");
      const rp = await api("/api/payment/create-order", "POST", { orderId, accessToken });
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rp.amount,
          currency: "INR",
          order_id: rp.razorpayOrderId,
          name: rp.storeName,
          prefill: { email: rp.email },
          handler: async (res: any) => {
            try {
              await api("/api/payment/verify", "POST", res);
              router.refresh();
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled. You can try again.")) },
        });
        checkout.on("payment.failed", () => reject(new Error("Payment failed. Please try again.")));
        checkout.open();
      });
    }, "");

  const cancel = () => {
    if (!confirm("Cancel this order?")) return;
    run(async () => {
      await api(`/api/orders/${orderId}/cancel`, "POST", { accessToken });
      router.refresh();
    }, "");
  };

  return (
    <div className="border rounded p-3 space-y-3 text-sm">
      {canPay && <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />}
      {canPay && (
        <p>Payment is not complete yet. We hold your items for a short while, then release them.</p>
      )}
      <div className="flex gap-3 flex-wrap">
        {canPay && (
          <button disabled={loading} onClick={pay} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
            {loading ? "Please wait..." : `Pay now ${amountLabel}`}
          </button>
        )}
        <button disabled={loading} onClick={cancel} className="border rounded px-4 py-2 disabled:opacity-50">Cancel order</button>
      </div>
      {msg && <p className="text-red-600">{msg}</p>}
    </div>
  );
}
