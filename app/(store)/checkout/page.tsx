"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import StateSelect from "@/components/StateSelect";
import { api } from "@/lib/fetcher";
import { inr } from "@/lib/format";
import { useForm, useAction } from "@/lib/hooks";
import { FormMessage, Section, TextField, CheckField, SubmitButton } from "@/components/ui/fields";

declare global { interface Window { Razorpay: any } }

type Saved = { id: string; label: string; name: string; phone: string; pincode: string; state: string; address: string; isDefault: boolean };

export default function Checkout() {
  const router = useRouter();
  const { status } = useSession();
  const loggedIn = status === "authenticated";
  const { items, total, clear, ready } = useCart();
  const pending = useRef<{ sig: string; id: string; token: string } | null>(null);
  const { values: v, setValues, field } = useForm({
    guestEmail: "", shippingName: "", shippingPhone: "", shippingPincode: "", shippingState: "", shippingAddress: "",
  });
  const { run, loading, msg, status: actionStatus } = useAction();

  const [saved, setSaved] = useState<Saved[]>([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const filled = useRef(false);

  const [codeInput, setCodeInput] = useState("");
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponStatus, setCouponStatus] = useState<"" | "ok" | "error">("");
  const [choice, setChoice] = useState<"online" | "cod">("online");
  const [quote, setQuote] = useState<any>(null);

  const itemsKey = JSON.stringify(items.map((i) => [i.variantId, i.qty]));
  const pin = /^[1-9]\d{5}$/.test(v.shippingPincode) ? v.shippingPincode : "";
  const method = choice === "cod" && quote?.codAvailable ? "cod" : "online";

  const fill = (a: Saved) =>
    setValues((p) => ({ ...p, shippingName: a.name, shippingPhone: a.phone, shippingPincode: a.pincode, shippingState: a.state, shippingAddress: a.address }));

  // Logged-in customers start with their default saved address
  useEffect(() => {
    if (!loggedIn) return;
    api("/api/account/addresses")
      .then((rows: Saved[]) => {
        setSaved(rows);
        const d = rows.find((r) => r.isDefault) ?? rows[0];
        if (d && !filled.current) { filled.current = true; fill(d); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn]);

  useEffect(() => {
    if (!ready || status === "loading" || !items.length) return;
    let live = true;
    api("/api/checkout/quote", "POST", {
      items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
      couponCode: coupon,
      pincode: pin,
      method: choice,
    })
      .then((q) => {
        if (!live) return;
        setQuote(q);
        if (coupon && q.couponError) { setCouponMsg(q.couponError); setCouponStatus("error"); setCoupon(""); }
        else if (coupon) { setCouponMsg(`Coupon ${q.couponCode} applied`); setCouponStatus("ok"); }
      })
      .catch((e) => { if (live) { setCouponMsg(e.message); setCouponStatus("error"); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, status, itemsKey, coupon, pin, choice]);

  if (!ready || status === "loading") return <p className="p-6" role="status" aria-live="polite">Loading...</p>;
  if (!items.length) return <main className="p-6 text-center"><p>Your cart is empty.</p></main>;

  const blocked = !!pin && !!quote && !quote.deliverable;
  const grand = quote?.total ?? total;

  const pay = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      if (blocked) throw new Error("Sorry, we do not deliver to this pincode yet");
      if (!v.shippingState) throw new Error("Please choose your state");
      if (method === "online" && !window.Razorpay)
        throw new Error("Payment window is still loading. Try again in a moment.");

      // reuse the same order if the customer retries with identical details
      const sig = JSON.stringify([v, itemsKey, coupon, method, saveAddress]);
      if (pending.current?.sig !== sig) {
        const { guestEmail, ...address } = v;
        const r = await api("/api/orders", "POST", {
          ...address,
          ...(loggedIn ? { saveAddress } : { guestEmail }),
          couponCode: coupon,
          paymentMethod: method,
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
        });
        pending.current = { sig, id: r.orderId, token: r.accessToken };
      }
      const { id: orderId, token } = pending.current!;
      const finish = () => {
        clear();
        router.push(loggedIn ? `/orders/${orderId}` : `/track/${token}`);
      };

      if (method === "cod") return finish();

      const rp = await api("/api/payment/create-order", "POST", { orderId, accessToken: token });
      await new Promise<void>((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: rp.amount,
          currency: "INR",
          order_id: rp.razorpayOrderId,
          name: rp.storeName,
          prefill: { name: v.shippingName, email: rp.email, contact: v.shippingPhone },
          handler: async (res: any) => {
            try {
              await api("/api/payment/verify", "POST", res);
              finish();
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error("Payment cancelled. You can try again.")) },
        });
        checkout.on("payment.failed", () => reject(new Error("Payment failed. Please try again.")));
        checkout.open();
      });
    }, "");
  };

  const row = "flex justify-between";
  return (
    <main className="max-w-xl mx-auto p-4 space-y-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Checkout</h1>

      <div className="surface p-4 text-sm space-y-1">
        {items.map((i) => (
          <p key={i.variantId} className={row}>
            <span className="text-[var(--ink-soft)]">{i.name} ({i.color}, {i.size}) × {i.qty}</span>
            <span>{inr(i.price * i.qty)}</span>
          </p>
        ))}
        <div className="border-t border-[var(--line)] pt-2 mt-2 space-y-1">
          <p className={row}><span className="text-[var(--ink-soft)]">Subtotal</span><span>{inr(quote?.subtotal ?? total)}</span></p>
          {quote?.discount > 0 && (
            <p className={`${row} text-[var(--ok)]`}><span>Discount ({quote.couponCode})</span><span>-{inr(quote.discount)}</span></p>
          )}
          {quote && <p className={row}><span className="text-[var(--ink-soft)]">Shipping</span><span>{quote.shipping ? inr(quote.shipping) : "Free"}</span></p>}
          {quote?.codFee > 0 && <p className={row}><span className="text-[var(--ink-soft)]">Cash on Delivery fee</span><span>{inr(quote.codFee)}</span></p>}
          {quote && quote.shipping > 0 && quote.freeShippingAbove > 0 && (
            <p className="text-xs text-[var(--accent)]">Add {inr(Math.max(quote.freeShippingAbove - quote.subtotal, 0))} more for free shipping</p>
          )}
          <p className={`${row} mt-1 border-t border-[var(--line)] pt-2 font-semibold text-base`}><span>Total</span><span>{inr(grand)}</span></p>
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="coupon-code" className="block text-sm font-medium text-[var(--ink)]">Coupon code</label>
        <div className="flex gap-2">
          <input id="coupon-code" className="input flex-1 text-sm uppercase"
            value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
          <button type="button" className="btn btn-outline btn-sm"
            onClick={() => { setCouponMsg(""); setCouponStatus(""); setCoupon(codeInput.trim().toUpperCase()); }}>Apply</button>
          {coupon && (
            <button type="button" className="btn btn-link btn-sm"
              onClick={() => { setCoupon(""); setCodeInput(""); setCouponMsg(""); setCouponStatus(""); }}>Remove</button>
          )}
        </div>
        <FormMessage msg={couponMsg} status={couponStatus} />
      </div>

      <form onSubmit={pay} className="space-y-4">
        {!loggedIn && (
          <Section title="Your email">
            <TextField label="Email (we send your order updates here)" type="email" required {...field("guestEmail")} />
            <p className="text-xs text-[var(--ink-soft)]">
              Checking out as a guest. Have an account?{" "}
              <Link href="/login?next=/checkout" className="link-underline">Log in</Link> to use your saved addresses.
            </p>
          </Section>
        )}

        <Section title="Delivery details">
          {loggedIn && saved.length > 0 && (
            <label className="block text-sm">Saved address
              <select className="input mt-1" defaultValue={(saved.find((a) => a.isDefault) ?? saved[0]).id}
                onChange={(e) => { const a = saved.find((x) => x.id === e.target.value); if (a) fill(a); }}>
                {saved.map((a) => <option key={a.id} value={a.id}>{a.label || a.name}: {a.address.slice(0, 40)}</option>)}
                <option value="">Use a different address</option>
              </select>
            </label>
          )}
          <TextField label="Full name" required {...field("shippingName")} />
          <TextField label="Mobile number (10 digits)" type="tel" required {...field("shippingPhone")} />
          <TextField label="Pincode (6 digits)" type="tel" required {...field("shippingPincode")} />
          {pin && quote && (
            quote.deliverable
              ? <p className="text-xs font-medium text-[var(--ok)]">Delivery available to {pin}</p>
              : <p className="text-xs font-medium text-[var(--danger)]">Sorry, we do not deliver to {pin} yet</p>
          )}
          <StateSelect value={v.shippingState} onChange={(s) => setValues((p) => ({ ...p, shippingState: s }))} />
          <TextField label="Full address" rows={3} required {...field("shippingAddress")} />
          {loggedIn && <CheckField label="Save this address for next time" value={saveAddress} onChange={setSaveAddress} />}
        </Section>

        {quote?.codEnabled && (
          <Section title="Payment method">
            <label className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border p-3 text-sm cursor-pointer transition ${method === "online" ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]" : "border-[var(--line-strong)] hover:border-[var(--muted)]"}`}>
              <input type="radio" checked={method === "online"} onChange={() => setChoice("online")} />
              Pay online (UPI, cards, netbanking)
            </label>
            <label className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] border p-3 text-sm transition ${!quote.codAvailable ? "opacity-50 cursor-not-allowed border-[var(--line-strong)]" : method === "cod" ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_8%,transparent)] cursor-pointer" : "border-[var(--line-strong)] hover:border-[var(--muted)] cursor-pointer"}`}>
              <input type="radio" disabled={!quote.codAvailable} checked={method === "cod"} onChange={() => setChoice("cod")} />
              Cash on Delivery{quote.codCharge > 0 && ` (+${inr(quote.codCharge)} fee)`}
            </label>
            {!quote.codAvailable && (
              <p className="text-xs text-[var(--ink-soft)]">
                {quote.codBlocked?.length
                  ? `Cash on Delivery is not available for: ${quote.codBlocked.join(", ")}`
                  : pin
                  ? "Cash on Delivery is not available for this pincode or order value."
                  : "Enter your pincode to check Cash on Delivery."}
              </p>
            )}
          </Section>
        )}

        <FormMessage msg={msg} status={actionStatus} />
        <SubmitButton loading={loading || !quote || blocked}>
          {method === "cod" ? `Place order (pay ${inr(grand)} on delivery)` : `Pay ${inr(grand)}`}
        </SubmitButton>
      </form>
    </main>
  );
}
