import { cache } from "react";
import { prisma } from "./prisma";
import { getSettings } from "./settings";

export const PAGE_TITLES: Record<string, string> = {
  "privacy-policy": "Privacy Policy",
  terms: "Terms and Conditions",
  "shipping-policy": "Shipping Policy",
  contact: "Contact Us",
};

async function defaultContent(slug: string) {
  const s = await getSettings();
  const n = s.siteName;
  const e = s.contactEmail || "[your email]";
  const text: Record<string, string> = {
    "privacy-policy": `Last updated: [date]

${n} ("we", "us") respects your privacy. This policy explains what we collect and how we use it.

What we collect
Your name, email, phone number, delivery address and order history when you register or place an order. We also collect basic usage data (pages visited, device type) through analytics.

How we use it
To process and deliver orders, send order updates, handle returns and refunds, answer your questions, and improve our store.

Payments
Online payments are processed securely by Razorpay. We never see or store your card, UPI or bank details.

Sharing
We share your name, phone number and address only with courier partners to deliver your order, and with service providers who help us run the store. We do not sell your data.

Your rights
You can download or delete your data any time from My account. You can also email ${e}. When an account is deleted we keep order records without your name, phone and address, because we must keep sales and tax records.

Security
Passwords are stored in encrypted form and we use HTTPS. Please keep your password private.

Contact
${e}`,

    terms: `By using ${n} you agree to these terms.

Products and prices
We try to keep descriptions, images and prices accurate. Colours may vary slightly by screen. If a price or stock error occurs, we may cancel the order and refund you in full.

Orders
An order is confirmed after payment (or confirmation, for Cash on Delivery). We may cancel orders we cannot fulfil, with a full refund.

Payments
Prices are in Indian Rupees (INR). Online payments are handled by Razorpay.

Shipping and returns
See our Shipping Policy and Return Policy.

Accounts
Keep your login details private. You are responsible for activity on your account.

Misuse
Do not misuse the site, try to hack it, or place fraudulent orders. We may block such accounts.

Liability
To the extent permitted by law, our liability is limited to the value of your order.

Governing law
These terms are governed by the laws of India. Disputes fall under the courts of [your city].

Contact
${e}`,

    "shipping-policy": `Processing time
Orders are packed within [1-2 business days] of confirmation.

Delivery time
Delivery usually takes [3-7 business days] depending on your location.

Shipping charges
Shipping charges, and any free shipping offer, are shown at checkout before you pay.

Cash on Delivery
Where available, COD is offered at checkout. Any COD fee is shown before you place the order. Please keep the exact amount ready.

Tracking
When your order ships we email you the courier name and tracking number. You can also track it under My orders.

Delivery area
We deliver to the pincodes accepted at checkout. Enter your pincode on a product page to check.

Delays and failed delivery
Delays can happen due to weather, festivals or courier issues. If delivery fails because of a wrong address or a refused order, [we may charge return shipping].

Damaged or wrong item
Email ${e} within [48 hours] of delivery with photos and we will make it right.`,

    contact: `Questions about an order, sizes or returns? Message us below or use the details on this page. Please include your order number if you have one. We usually reply within [1 business day].`,
  };
  return text[slug];
}

// The page and its metadata can ask for a missing page at the same moment, so creating it must never fail.
export const getPage = cache(async (slug: string) => {
  if (!(slug in PAGE_TITLES)) return null;
  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) return existing;
  try {
    return await prisma.page.create({
      data: { slug, title: PAGE_TITLES[slug], content: await defaultContent(slug) },
    });
  } catch {
    return prisma.page.findUniqueOrThrow({ where: { slug } });
  }
});
