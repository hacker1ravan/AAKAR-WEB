# Automated checks

`tests/e2e.mjs` places real orders, creates accounts, pays (with simulated Razorpay signatures), ships, returns and
cancels, and checks the results against the database. It covers the storefront, checkout (logged in and guest), the
account page, the admin panel, invoices, emails and the security rules.

**It DELETES ALL DATA in the database it points at.** Use a separate, empty database, never your live one.

## Run it

1. Create a second, empty database just for testing. On Neon: open your project, Databases, New database,
   and name it something that contains the word `test` (for example `store_test`).
2. In `.env`, point `DATABASE_URL` and `DIRECT_URL` at that test database, then create its tables:
   `npx prisma migrate deploy` (or `npx prisma migrate dev`).
3. Add these lines to `.env` while testing. Leave `SMTP_HOST` empty so no real emails are sent:
   ```
   E2E_ALLOW_RESET="yes"
   E2E_MAIL_LOG=".e2e-mail.log"
   ```
   `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and `CRON_SECRET` should also have values (any text is fine for the
   last two). Checks that need a missing value are skipped and say so.
4. Start the store in one terminal (`npm run build && npm start`, or `npm run dev`) and run the tests in another:
   `npm run test:e2e`

A finished run prints how many checks passed, failed and were skipped. When you are done, put your normal database
URLs back in `.env` and remove the two test lines.
