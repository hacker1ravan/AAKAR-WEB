# Clothing Store

An online store for clothes, jewellery and similar products, with a full admin panel.
Built with Next.js 15, PostgreSQL (Prisma), NextAuth, Razorpay, Cloudinary and Tailwind CSS.

## What is included

**Storefront**: home page with banners and categories, shop with search, filters, sorting and pages, product pages
(sizes, colours, stock, sale price, size chart, reviews, related products), cart, wishlist, checkout for guests and
customers (coupon, shipping charge, pincode check, saved addresses, Cash on Delivery or online payment with Razorpay),
customer account page (name, password, saved addresses), email confirmation, order tracking, "Pay now" for unpaid
orders, customers cancelling unpaid or not-yet-shipped COD orders, returns,
GST invoice (CGST/SGST or IGST, HSN codes, print, PDF, and attached to the "shipped" email), forgot password,
legal pages, contact form, cookie notice (when Google Analytics is used), custom 404 and error pages, and for customers
"Download my data" and "Delete my account".

**Admin panel** (`/admin`): dashboard, sales charts, products (add, edit, hide, duplicate, quick price edit),
categories, low stock alerts, orders (status, courier and tracking, emails to the customer, CSV export), customers,
returns and refunds, coupons, banners, reviews, editable pages, shipping labels, and settings (name, logo, colours,
SEO, maintenance mode, shipping, couriers, COD, pincodes, GST, WhatsApp). Orders can be searched and filtered.
Admins can switch on two-factor login (Security) and see who changed what (Activity).

## Set up on your computer

You need Node.js 20 or newer. Create these free accounts first:

| Service | Why | Needed to start? |
|---|---|---|
| [Neon](https://neon.tech) | PostgreSQL database | Yes |
| [Razorpay](https://razorpay.com) (Test Mode) | Payments | For online payments |
| [Cloudinary](https://cloudinary.com) | Product image uploads | For uploading images |
| [Brevo](https://www.brevo.com) | Sending emails (SMTP) | No: without it, emails are printed in the terminal |

Then:

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

1. In Neon, create a project **just for development** and paste its connection string into both
   `DATABASE_URL` and `DIRECT_URL` in `.env`.
2. Generate a secret and paste it into `NEXTAUTH_SECRET`: `openssl rand -base64 32`
   (on Windows PowerShell: `[Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))`).
3. Add your Razorpay **test** keys (Settings, API Keys) and your Cloudinary details.
4. Create the tables, your admin login, and (optionally) sample products:

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run db:demo        # optional sample categories, products, coupon and banner
npm run dev
```

Open http://localhost:3000. New customers must confirm their email before they can log in. Until you add email
details (Brevo), the confirmation link is printed in the terminal where `npm run dev` is running. Admin login: the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from `.env`
(default `admin@yourstore.com` / `ChangeThisPassword123`). Change this password before a real launch.

## Try everything once

1. `/admin/settings`: set your store name, contact email, shipping, COD and (optionally) the pincodes you deliver to.
2. `/admin/categories` then `/admin/products`: add a category and a product with images, sizes and stock.
3. Register a customer account in a private window and place an order.
   Razorpay test card: `4111 1111 1111 1111`, any future expiry, any CVV. Also try Cash on Delivery.
4. Back in `/admin/orders`: mark the order shipped (add a tracking number), then delivered.
   The customer's emails appear in the terminal if SMTP is not configured.
5. As the customer, request a return. Approve, receive and refund it in `/admin/returns`.
6. Check `/admin/low-stock`, `/admin/sales`, the CSV exports and the invoice (`Download invoice` on an order).

Check the code at any time with `npm run typecheck`. An automated test that places orders, pays, ships and returns
them is in `tests/` (read `tests/README.md` first: it uses a separate test database and deletes its data).

After the first `npx prisma migrate dev`, keep the new `prisma/migrations` folder: you need it when you go live.

## Where things are

```
app/(store)/      customer pages
app/admin/        admin panel pages
app/api/          API routes (admin routes check the admin role on the server)
components/       shared UI pieces
lib/              pricing, orders, emails, settings and other logic
prisma/           database schema and seed scripts
_deploy-later/    hosting files (see "Going live")
```

## Good to know

- **Prices are stored in paise** (₹499 is 49900). The admin forms take rupees and convert for you.
- **The server calculates every price.** Cart totals, coupons, shipping and COD fees are recalculated at checkout,
  so a customer cannot change them in the browser.
- **Unpaid online orders** hold stock for an hour, then are cancelled and the stock goes back on sale. This happens by
  itself: when someone places an order and as the store is used. `/api/cron/expire-orders` can also be called on a
  schedule (it needs `CRON_SECRET`), but nothing breaks if you never set that up.
- **COD refunds** are recorded in the admin panel, but you send the money yourself.
- **Razorpay webhooks** cannot reach your computer, so locally the payment is confirmed by the checkout page.
  On a live site, add the webhook as well, so a payment is never missed if a customer closes the tab.
- **GST**: set your GSTIN in Settings (its first two digits are your state). Customers choose their state at checkout:
  the same state gets CGST and SGST, another state gets IGST. HSN codes are optional per product. Prices include GST.
  Check the rates, HSN codes and invoice format with your accountant.
- **Shipping**: there is no live Shiprocket or Delhivery connection. You choose the courier and type the tracking number.
  In Settings, put each courier's tracking link after a bar, for example `Delhivery | https://.../track?awb={awb}`
  (copy it from the courier's tracking page and put `{awb}` where the number goes) and customers get a working link.
  Print a parcel label from the order screen (Label).
- **Guest orders** are opened from a private link in the order emails. If a guest uses an email that already has an
  account, they are asked to log in. Guests cannot request returns until they create an account with that email.
- **Errors**: unexpected server errors are logged and emailed to your contact email (at most once per 30 minutes for
  the same error). Set `ALERT_WEBHOOK_URL` to send them to Slack, Discord or Google Chat instead.
- **PDF invoices** show names written in non-Latin scripts as "?". The web invoice shows them correctly.
- **Two-factor login**: in the admin panel, Security, scan the QR code with an authenticator app and keep the 8 backup
  codes safe. Set `ADMIN_REQUIRE_2FA="1"` in `.env` to make every admin use it. Locked out? Run
  `ADMIN_EMAIL=you@example.com npx tsx prisma/reset-2fa.ts`. Two-factor secrets are encrypted with `TWO_FACTOR_KEY`
  (or `NEXTAUTH_SECRET`); changing that key means resetting two-factor for each admin.
- **Activity log**: admin changes, admin sign-ins, failed two-factor attempts, data exports and customer privacy requests
  are recorded for a year (admin panel, Activity). Passwords and codes are never recorded.
- **Privacy**: customers can download their data and delete their account from My account. Deleting removes name,
  email, addresses, wishlist and reviews; order records stay without name, phone and address, because the store must keep
  sales and tax records. Ask your accountant and lawyer how long to keep them and whether your privacy policy needs more.
- **Sessions** are checked on every visit: a deleted account, a changed or reset password, or a turned-off two-factor
  login ends all sessions straight away. Admins must log in again after 12 hours.
- Logins last 14 days.
- Dates are always shown in Indian time. Product pages include Google product markup (price, stock, ratings).
- Customers can cancel an unpaid online order or a COD order that has not shipped. Paid orders are cancelled by you in the
  admin panel, and you refund them from the Razorpay dashboard.
- **Policy pages** (`/admin/pages`) start with sample text containing `[brackets]`. Replace them and get the
  text reviewed before launch.
- The admin role is checked again when it matters, but changing a user's role in the database only takes effect
  after they log in again.

## Going live (later)

`_deploy-later/` holds a hosting config (`netlify.toml`) and two GitHub Actions files (a scheduled call to the
order-expiry route and a daily database backup). They do nothing until you are ready to deploy, so leave them
there for now. When you are, use a separate production database and live Razorpay keys.
