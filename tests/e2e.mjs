// End-to-end checks against a running copy of the store. READ tests/README.md BEFORE RUNNING: it deletes all data.
import "dotenv/config";
import pg from "pg";
import crypto from "crypto";
import fs from "fs";
import bcrypt from "bcryptjs";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3000";
const MAIL = process.env.E2E_MAIL_LOG || "";
const DBURL = process.env.DATABASE_URL || "";

// Safety: this script wipes the database it points at.
let dbName = "";
try { dbName = new URL(DBURL).pathname.slice(1); } catch {}
if (!/test/i.test(dbName) || process.env.E2E_ALLOW_RESET !== "yes") {
  console.error(`Refusing to run: the database name ("${dbName}") must contain "test" and E2E_ALLOW_RESET=yes must be set.\nThis script DELETES ALL DATA in that database. See tests/README.md.`);
  process.exit(2);
}

const db = new pg.Client({ connectionString: DBURL });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

let pass = 0, failN = 0, skipped = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ok  ", name); }
  else { failN++; console.log("  FAIL", name, extra ? "-> " + String(extra).slice(0, 400) : ""); }
};
const skip = (name, why) => { skipped++; console.log("  skip", name, "(" + why + ")"); };

class C {
  constructor(ip) { this.j = new Map(); this.ip = ip; }
  async f(path, { method = "GET", json, headers = {}, body: raw } = {}) {
    const h = { "x-forwarded-for": this.ip, ...headers };
    if (this.j.size) h.cookie = [...this.j].map(([k, v]) => k + "=" + v).join("; ");
    let body = raw;
    if (json !== undefined) { h["content-type"] = "application/json"; body = JSON.stringify(json); }
    const r = await fetch(BASE + path, { method, headers: h, body, redirect: "manual" });
    for (const sc of r.headers.getSetCookie()) {
      const [kv] = sc.split(";"); const i = kv.indexOf("=");
      const k = kv.slice(0, i), v = kv.slice(i + 1);
      if (/Max-Age=0|1970/i.test(sc)) this.j.delete(k); else this.j.set(k, v);
    }
    return r;
  }
  async json(path, opts) { const r = await this.f(path, opts); let d = null; try { d = await r.json(); } catch {} return { s: r.status, d }; }
  async text(path, opts) { const r = await this.f(path, opts); return { s: r.status, t: await r.text(), h: r.headers }; }
  async login(email, password) {
    const { csrfToken } = await (await this.f("/api/auth/csrf")).json();
    const body = new URLSearchParams({ csrfToken, email, password, json: "true" }).toString();
    const r = await this.f("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
    let d = {}; try { d = await r.json(); } catch {}
    return d;
  }
  async me() { return (await (await this.f("/api/auth/session")).json())?.user; }
}

// Emails are written to a file while testing, which is how the tests read confirmation and reset links.
const HAVE_MAIL = !!MAIL;
function mailTo(email) {
  if (!HAVE_MAIL || !fs.existsSync(MAIL)) return [];
  return fs.readFileSync(MAIL, "utf8").split("[email not sent").filter((b) => b.includes(`To: ${email}\n`));
}
function linkToken(email, kind) {
  const re = kind === "verify" ? /verify-email\?token=([a-f0-9]{64})/ : /reset-password\?token=([a-f0-9]{64})/;
  const hit = mailTo(email).filter((b) => re.test(b)).pop();
  return hit ? hit.match(re)[1] : null;
}

// ---------- start from an empty database ----------
const tables = (await q(`select tablename from pg_tables where schemaname='public' and tablename not like '\\_%'`)).map((r) => `"${r.tablename}"`);
await q(`TRUNCATE ${tables.join(",")} RESTART IDENTITY`);
if (HAVE_MAIL) fs.writeFileSync(MAIL, "");
const ADMIN_PASS = "E2eAdminPass123";
await q(`INSERT INTO "User"(id,email,password,name,role,"emailVerified") VALUES ($1,$2,$3,$4,$5,now())`, ["e2e-admin", "admin@e2e.test", await bcrypt.hash(ADMIN_PASS, 10), "Admin", "admin"]);
await q(`INSERT INTO "SiteSettings"(id,"contactEmail","updatedAt") VALUES ('main','owner@e2e.test',now())`);

const anon = new C("10.1.0.1"), cust = new C("10.1.0.2"), cust2 = new C("10.1.0.3"), admin = new C("10.1.0.4"), guestC = new C("10.1.0.5");
function b32decode(str) { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = 0, val = 0; const out = []; for (const ch of str.toUpperCase()) { const i = A.indexOf(ch); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } } return Buffer.from(out); }
function totpAt(secret, ms = Date.now()) { const step = Math.floor(ms / 30000); const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac("sha1", b32decode(secret)).update(b).digest(); const o = h[19] & 15; const c = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(c % 1000000).padStart(6, "0"); }
const sig = (secret, s) => crypto.createHmac("sha256", secret).update(s).digest("hex");
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const HOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "";
const CRON = process.env.CRON_SECRET || "";

async function register(client, name, email, password) {
  const r = await client.json("/api/auth/register", { method: "POST", json: { name, email, password } });
  return r;
}
async function confirmEmail(email) {
  const t = linkToken(email, "verify");
  if (t) return (await anon.json("/api/auth/verify-email", { method: "POST", json: { token: t } })).s === 200;
  await q(`UPDATE "User" SET "emailVerified"=now() WHERE email=$1`, [email]);
  return true;
}

console.log("\n# Public pages and custom error pages");
for (const p of ["/", "/products", "/login", "/register", "/forgot-password", "/privacy-policy", "/terms", "/shipping-policy", "/contact", "/return-policy", "/cart", "/checkout", "/robots.txt", "/sitemap.xml", "/verify-email?token=abc"]) {
  const r = await anon.text(p); check("GET " + p, r.s === 200, r.s);
}
for (const p of ["/admin", "/admin/settings", "/account", "/orders", "/wishlist"]) { const r = await anon.f(p); check(p + " redirects when logged out", [302, 307].includes(r.status), r.status); }
const nf1 = await anon.text("/nope-page"); check("unknown page: custom 404 (store)", nf1.s === 404 && nf1.t.includes("We could not find that page"), nf1.s);
const nf2 = await anon.text("/a/b/c"); check("unknown path: custom 404 (site-wide)", nf2.s === 404 && nf2.t.includes("We could not find that page"), nf2.s);
check("track page rejects a malformed link", (await anon.text("/track/abc")).s === 404);
check("track page rejects an unknown link", (await anon.text("/track/" + "0".repeat(48))).s === 404);

console.log("\n# Registration and email confirmation");
const reg = await register(cust, "Asha Rao", "asha@e2e.test", "AshaPass1234");
check("register", reg.s === 201 && reg.d.needsVerification === true, JSON.stringify(reg));
check("duplicate of an unconfirmed email is allowed to re-register", (await register(cust, "Asha Rao", "asha@e2e.test", "AshaPass1234")).s === 201);
check("short password rejected", (await register(cust, "A", "x@e2e.test", "123")).s === 400);
const noLogin = new C("10.1.0.9"); await noLogin.login("asha@e2e.test", "AshaPass1234");
check("cannot log in before confirming the email", !(await noLogin.me()));
if (HAVE_MAIL) {
  check("confirmation email was sent", !!linkToken("asha@e2e.test", "verify"));
  check("bad confirmation link rejected", (await anon.json("/api/auth/verify-email", { method: "POST", json: { token: "f".repeat(64) } })).s === 400);
  const t = linkToken("asha@e2e.test", "verify");
  check("confirm email", (await anon.json("/api/auth/verify-email", { method: "POST", json: { token: t } })).s === 200);
  check("confirmation link works once", (await anon.json("/api/auth/verify-email", { method: "POST", json: { token: t } })).s === 400);
  // an unconfirmed address can be claimed by its real owner
  await register(anon, "Squatter", "late@e2e.test", "SquatterPass1");
  await register(new C("10.1.0.20"), "Real Owner", "late@e2e.test", "OwnerPass1234");
  await confirmEmail("late@e2e.test");
  const owner = new C("10.1.0.21");
  await owner.login("late@e2e.test", "SquatterPass1");
  check("squatter's password does not work after the owner registers", !(await owner.me()));
  await owner.login("late@e2e.test", "OwnerPass1234");
  check("the real owner can log in", (await owner.me())?.email === "late@e2e.test");
} else {
  await confirmEmail("asha@e2e.test");
  skip("email link checks", "set E2E_MAIL_LOG to test them");
}
check("duplicate of a confirmed email is rejected", (await register(anon, "A", "asha@e2e.test", "AshaPass1234")).s === 409);
await register(cust2, "Ravi K", "ravi@e2e.test", "RaviPass1234"); await confirmEmail("ravi@e2e.test");
await cust.login("asha@e2e.test", "AshaPass1234");
await cust2.login("ravi@e2e.test", "RaviPass1234");
await admin.login("admin@e2e.test", ADMIN_PASS);
check("customer session", (await cust.me())?.email === "asha@e2e.test" && (await cust.me())?.role === "customer");
check("admin session", (await admin.me())?.role === "admin");
check("customer cannot call admin API", (await cust.json("/api/admin/settings")).s === 403);
check("anonymous cannot call admin API", (await anon.json("/api/admin/orders")).s === 403);
check("customer is redirected away from /admin", [302, 307].includes((await cust.f("/admin")).status));
check("resend confirmation always answers the same", (await anon.json("/api/auth/resend-verification", { method: "POST", json: { email: "nobody@e2e.test" } })).s === 200);

console.log("\n# Settings, GST and couriers");
const stBody = (({ id, updatedAt, ...r }) => r)((await admin.json("/api/admin/settings")).d);
Object.assign(stBody, { codEnabled: true, codFee: 4000, codMaxOrder: 0, deliveryPincodes: "560001 400001", shippingFlatRate: 5000, freeShippingAbove: 99900, lowStockThreshold: 5, siteName: "Test Store", whatsappNumber: "919876543210", gstin: "29abcde1234f1z5", couriers: "Delhivery | https://track.example.com/t?awb={awb}\nDTDC\nBlue Dart" });
const put = await admin.json("/api/admin/settings", { method: "PUT", json: stBody });
check("save settings (GSTIN is upper-cased)", put.s === 200 && put.d.gstin === "29ABCDE1234F1Z5", JSON.stringify(put.d));
check("invalid GSTIN rejected", (await admin.json("/api/admin/settings", { method: "PUT", json: { ...stBody, gstin: "123" } })).s === 400);
const badLink = await admin.json("/api/admin/settings", { method: "PUT", json: { ...stBody, couriers: "Delhivery | http://insecure.example.com/{awb}" } });
check("courier link must be https and contain {awb}", badLink.s === 400 && /https/.test(badLink.d?.error || ""), JSON.stringify(badLink.d));
check("invalid colour rejected", (await admin.json("/api/admin/settings", { method: "PUT", json: { ...stBody, primaryColor: "red" } })).s === 400);
const home = await anon.text("/"); check("site name and WhatsApp button show", home.t.includes("Test Store") && home.t.includes("wa.me/919876543210"));

console.log("\n# Categories and products");
const c1 = await admin.json("/api/admin/categories", { method: "POST", json: { name: "Clothes", imageUrl: "", position: 0, active: true, codAvailable: true, sizeChart: "Size | Chest\nM | 38\nL | 40" } });
const c2 = await admin.json("/api/admin/categories", { method: "POST", json: { name: "Jewellery", imageUrl: "", position: 1, active: true, codAvailable: false, sizeChart: "" } });
check("create categories", c1.s === 201 && c2.s === 201, JSON.stringify([c1.d, c2.d]));
check("duplicate category rejected", (await admin.json("/api/admin/categories", { method: "POST", json: { name: "Clothes", imageUrl: "", position: 0, active: true, codAvailable: true, sizeChart: "" } })).s === 409);
const img = "https://placehold.co/600x800.png";
const prod = (o) => ({ name: "Item", description: "Nice item", price: 10000, comparePrice: 0, category: "Clothes", images: [img], codAvailable: true, active: true, gstRate: 5, hsnCode: "", variants: [{ size: "M", color: "Black", stock: 5 }], ...o });
const pa = await admin.json("/api/products", { method: "POST", json: prod({ name: "Linen Shirt", description: "Soft linen shirt", price: 49900, comparePrice: 69900, hsnCode: "6109", variants: [{ size: "M", color: "Black", stock: 10 }, { size: "L", color: "Black", stock: 6 }] }) });
const pb = await admin.json("/api/products", { method: "POST", json: prod({ name: "Gold Necklace", description: "Plated necklace", price: 99900, category: "Jewellery", gstRate: 3, variants: [{ size: "Free", color: "Gold", stock: 3 }] }) });
check("create products", pa.s === 201 && pb.s === 201, JSON.stringify([pa.d, pb.d]));
check("HSN code is saved", pa.d.hsnCode === "6109");
check("invalid HSN code rejected", (await admin.json("/api/products", { method: "POST", json: prod({ hsnCode: "12" }) })).s === 400);
check("MRP below price rejected", (await admin.json("/api/products", { method: "POST", json: prod({ price: 500, comparePrice: 100 }) })).s === 400);
const A = pa.d, B = pb.d;
const vAM = A.variants.find((v) => v.size === "M").id, vAL = A.variants.find((v) => v.size === "L").id, vB = B.variants[0].id;
const pageA = await anon.text("/products/" + A.id);
check("product page renders (name, size chart, discount)", pageA.s === 200 && pageA.t.includes("Linen Shirt") && pageA.t.includes("Size chart") && pageA.t.includes("% off"), pageA.s);
check("shop filter, search and sale filter", (await anon.text("/products?category=Jewellery")).t.includes("Gold Necklace") && !(await anon.text("/products?q=necklace")).t.includes("Linen Shirt") && !(await anon.text("/products?sale=1")).t.includes("Gold Necklace"));
const cl = await admin.json("/api/products", { method: "POST", json: prod({ name: "Cloud Tee", images: ["https://res.cloudinary.com/demo/image/upload/v1/sample.jpg"] }) });
const clPage = await anon.text("/products/" + cl.d.id);
check("Cloudinary photos are requested resized", clPage.t.includes("f_auto,q_auto,c_limit,w_900") && clPage.t.includes("srcSet"), clPage.s);
check("shop cards use a smaller copy", (await anon.text("/products")).t.includes("w_500"));

console.log("\n# Shop pagination");
for (let i = 1; i <= 12; i++) await admin.json("/api/products", { method: "POST", json: prod({ name: "Filler " + i }) });
const sp1 = await anon.text("/products"); const sp2 = await anon.text("/products?page=2"); const sp99 = await anon.text("/products?page=99");
check("page 1 shows 'Page 1 of 2'", sp1.t.includes("Page 1 of 2") || /Page <!-- -->1<!-- --> of <!-- -->2/.test(sp1.t), sp1.s);
check("page 2 exists", /Page (<!-- -->)?2(<!-- -->)? of (<!-- -->)?2/.test(sp2.t));
check("page beyond the end is clamped", /Page (<!-- -->)?2(<!-- -->)? of (<!-- -->)?2/.test(sp99.t));
check("filters are kept in the Next link", (await anon.text("/products?sort=price_asc")).t.includes("sort=price_asc&amp;page=2"));
for (const p of (await anon.json("/api/products")).d.filter((x) => x.name.startsWith("Filler") || x.name === "Cloud Tee")) await admin.json("/api/products/" + p.id, { method: "DELETE" });

console.log("\n# Pincode and quotes (guests included)");
check("pincode ok / not served / invalid", (await anon.json("/api/pincode?pin=560001")).d?.deliverable === true && (await anon.json("/api/pincode?pin=999999")).d?.deliverable === false && (await anon.json("/api/pincode?pin=12")).s === 400);
const cp = await admin.json("/api/admin/coupons", { method: "POST", json: { code: "welcome10", type: "percent", value: 10, minOrder: 0, maxDiscount: 20000, usageLimit: 0, perUserLimit: 1, expiresAt: null, active: true } });
check("create coupon (code upper-cased)", cp.s === 201 && cp.d.code === "WELCOME10");
const items2 = [{ variantId: vAM, qty: 2 }];
let qt = (await anon.json("/api/checkout/quote", { method: "POST", json: { items: items2, couponCode: "WELCOME10", pincode: "560001", method: "online" } })).d;
check("a guest gets a quote: total 94820", qt?.subtotal === 99800 && qt.discount === 9980 && qt.shipping === 5000 && qt.total === 94820, JSON.stringify(qt));
qt = (await cust.json("/api/checkout/quote", { method: "POST", json: { items: items2, couponCode: "WELCOME10", pincode: "560001", method: "cod" } })).d;
check("COD adds the fee: total 98820", qt?.codAvailable === true && qt.codFee === 4000 && qt.total === 98820, JSON.stringify(qt));
qt = (await cust.json("/api/checkout/quote", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], pincode: "560001", method: "cod" } })).d;
check("COD blocked by category", qt?.codAvailable === false && qt.codBlocked?.includes("Gold Necklace"));
check("undeliverable pincode flagged", (await cust.json("/api/checkout/quote", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], pincode: "999999" } })).d?.deliverable === false);
check("free shipping above the threshold", (await cust.json("/api/checkout/quote", { method: "POST", json: { items: [{ variantId: vAM, qty: 3 }], pincode: "560001" } })).d?.shipping === 0);
check("bad coupon reported", (await cust.json("/api/checkout/quote", { method: "POST", json: { items: items2, couponCode: "NOPE" } })).d?.couponError === "Invalid coupon code");

console.log("\n# Account: profile, password, saved addresses");
check("account page", (await cust.text("/account")).t.includes("Saved addresses"));
const adr = { label: "Home", name: "Asha Rao", phone: "9876543210", pincode: "560001", state: "29", address: "12 MG Road, Bengaluru 560001", isDefault: false };
const a1 = await cust.json("/api/account/addresses", { method: "POST", json: adr });
check("first address becomes the default", a1.s === 201 && a1.d.isDefault === true, JSON.stringify(a1));
const a2 = await cust.json("/api/account/addresses", { method: "POST", json: { ...adr, label: "Office", address: "5 Lake View Rd, Mumbai 400001", pincode: "400001", state: "27" } });
check("second address is not the default", a2.s === 201 && a2.d.isDefault === false);
check("invalid state rejected", (await cust.json("/api/account/addresses", { method: "POST", json: { ...adr, state: "99" } })).s === 400);
check("invalid phone rejected", (await cust.json("/api/account/addresses", { method: "POST", json: { ...adr, phone: "123" } })).s === 400);
check("make another address the default", (await cust.json("/api/account/addresses/" + a2.d.id, { method: "PUT", json: { ...adr, label: "Office", address: "5 Lake View Rd, Mumbai 400001", pincode: "400001", state: "27", isDefault: true } })).s === 200);
const list1 = (await cust.json("/api/account/addresses")).d;
check("only one default at a time", list1.filter((x) => x.isDefault).length === 1 && list1[0].id === a2.d.id);
check("another customer cannot edit my address", (await cust2.json("/api/account/addresses/" + a1.d.id, { method: "PUT", json: adr })).s === 404 && (await cust2.json("/api/account/addresses/" + a1.d.id, { method: "DELETE" })).s === 404);
check("deleting the default promotes another", (await cust.json("/api/account/addresses/" + a2.d.id, { method: "DELETE" })).s === 200 && (await cust.json("/api/account/addresses")).d[0].isDefault === true);
check("address list needs login", (await anon.json("/api/account/addresses")).d?.length === 0 && (await anon.json("/api/account/addresses", { method: "POST", json: adr })).s === 401);
check("change name", (await cust.json("/api/account/profile", { method: "PUT", json: { name: "Asha R" } })).s === 200 && (await q(`SELECT name FROM "User" WHERE email='asha@e2e.test'`))[0].name === "Asha R");
check("wrong current password refused", (await cust.json("/api/account/password", { method: "PUT", json: { currentPassword: "nope", newPassword: "BrandNew12345" } })).s === 400);
check("weak new password refused", (await cust.json("/api/account/password", { method: "PUT", json: { currentPassword: "AshaPass1234", newPassword: "123" } })).s === 400);
check("change password", (await cust.json("/api/account/password", { method: "PUT", json: { currentPassword: "AshaPass1234", newPassword: "BrandNew12345" } })).s === 200);
check("changing the password logs out the old session", !(await cust.me()));
await cust.login("asha@e2e.test", "BrandNew12345");
const fresh = new C("10.1.0.30"); await fresh.login("asha@e2e.test", "AshaPass1234");
check("old password stops working", !(await fresh.me()));
await fresh.login("asha@e2e.test", "BrandNew12345");
check("new password works", (await fresh.me())?.email === "asha@e2e.test");

console.log("\n# Orders (logged in)");
const addr = { shippingName: "Asha Rao", shippingPhone: "9876543210", shippingPincode: "560001", shippingState: "29", shippingAddress: "12 MG Road, Bengaluru 560001" };
const o1 = await cust.json("/api/orders", { method: "POST", json: { items: items2, couponCode: "WELCOME10", paymentMethod: "cod", saveAddress: true, ...addr } });
check("place COD order", o1.s === 201 && /^[a-f0-9]{48}$/.test(o1.d.accessToken), JSON.stringify(o1.d));
const row = (await q('SELECT * FROM "Order" WHERE id=$1', [o1.d.orderId]))[0];
check("COD order confirmed with correct total and state", row.status === "processing" && row.total === 98820 && row.codFee === 4000 && row.discount === 9980 && row.shippingState === "29", JSON.stringify(row));
check("stock reduced and coupon counted", (await q('SELECT stock FROM "Variant" WHERE id=$1', [vAM]))[0].stock === 8 && (await q('SELECT "usedCount" FROM "Coupon" WHERE code=$1', ["WELCOME10"]))[0].usedCount === 1);
check("same address is not saved twice", (await q('SELECT count(*)::int c FROM "Address" WHERE "userId"=(SELECT id FROM "User" WHERE email=$1)', ["asha@e2e.test"]))[0].c === 1);
check("coupon per-user limit enforced", (await cust.json("/api/orders", { method: "POST", json: { items: items2, couponCode: "WELCOME10", paymentMethod: "cod", ...addr } })).s === 409);
check("COD refused for jewellery", (await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], paymentMethod: "cod", ...addr } })).s === 409);
check("undeliverable pincode refused", (await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], paymentMethod: "online", ...addr, shippingPincode: "999999" } })).s === 409);
check("invalid phone refused", (await cust.json("/api/orders", { method: "POST", json: { items: items2, paymentMethod: "cod", ...addr, shippingPhone: "123" } })).s === 400);
const { shippingState: _s, ...noState } = addr;
check("missing state refused", (await cust.json("/api/orders", { method: "POST", json: { items: items2, paymentMethod: "cod", ...noState } })).s === 400);

const o2 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], paymentMethod: "online", ...addr } });
const r2 = (await q('SELECT status,total FROM "Order" WHERE id=$1', [o2.d.orderId]))[0];
check("online order starts pending, total 99900 (free shipping at the threshold)", o2.s === 201 && r2.status === "pending" && r2.total === 99900, JSON.stringify(r2));
const cr = await cust.json("/api/payment/create-order", { method: "POST", json: { orderId: o2.d.orderId } });
check("starting payment works or fails gracefully", cr.s === 200 || (cr.s === 502 && /Could not start/.test(cr.d?.error || "")), JSON.stringify(cr));
check("another customer cannot pay my order", (await cust2.json("/api/payment/create-order", { method: "POST", json: { orderId: o2.d.orderId } })).s === 404);
await q('UPDATE "Order" SET "razorpayOrderId"=$1 WHERE id=$2', ["order_TEST1", o2.d.orderId]);
const cr2 = await cust.json("/api/payment/create-order", { method: "POST", json: { orderId: o2.d.orderId } });
check("retrying payment reuses the Razorpay order", cr2.s === 200 && cr2.d.razorpayOrderId === "order_TEST1" && cr2.d.amount === 99900, JSON.stringify(cr2));
if (KEY_SECRET) {
  check("bad payment signature rejected", (await cust.json("/api/payment/verify", { method: "POST", json: { razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: "bad" } })).s === 400);
  const ver = { razorpay_order_id: "order_TEST1", razorpay_payment_id: "pay_TEST1", razorpay_signature: sig(KEY_SECRET, "order_TEST1|pay_TEST1") };
  check("verify marks the order paid", (await cust.json("/api/payment/verify", { method: "POST", json: ver })).s === 200 && (await q('SELECT status FROM "Order" WHERE id=$1', [o2.d.orderId]))[0].status === "paid");
  await cust.json("/api/payment/verify", { method: "POST", json: ver });
  check("verify twice is harmless", (await q('SELECT count(*)::int c FROM "OrderEvent" WHERE "orderId"=$1 AND status=$2', [o2.d.orderId, "paid"]))[0].c === 1);
} else { skip("payment signature checks", "RAZORPAY_KEY_SECRET is not set"); await q(`UPDATE "Order" SET status='paid' WHERE id=$1`, [o2.d.orderId]); }
const o3 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAL, qty: 1 }], paymentMethod: "online", ...addr } });
await q('UPDATE "Order" SET "razorpayOrderId"=$1 WHERE id=$2', ["order_TEST2", o3.d.orderId]);
if (HOOK_SECRET) {
  const raw = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { order_id: "order_TEST2", id: "pay_TEST2" } } } });
  check("webhook with a bad signature rejected", (await fetch(BASE + "/api/webhooks/razorpay", { method: "POST", body: raw, headers: { "x-razorpay-signature": "nope" } })).status === 400);
  const good = await fetch(BASE + "/api/webhooks/razorpay", { method: "POST", body: raw, headers: { "x-razorpay-signature": sig(HOOK_SECRET, raw) } });
  check("webhook marks the order paid", good.status === 200 && (await q('SELECT status FROM "Order" WHERE id=$1', [o3.d.orderId]))[0].status === "paid");
} else { skip("webhook checks", "RAZORPAY_WEBHOOK_SECRET is not set"); await q(`UPDATE "Order" SET status='paid' WHERE id=$1`, [o3.d.orderId]); }

console.log("\n# Guest checkout");
const g1email = "guest1@e2e.test";
const gaddr = { shippingName: "Guest One", shippingPhone: "9123456780", shippingPincode: "560001", shippingState: "29", shippingAddress: "7 Park Street, Bengaluru 560001" };
check("a guest must give an email", (await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", ...gaddr } })).s === 400);
check("a registered email cannot be used as a guest", (await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", guestEmail: "asha@e2e.test", ...gaddr } })).s === 409);
const g1 = await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", guestEmail: g1email, ...gaddr } });
check("guest places a COD order", g1.s === 201 && /^[a-f0-9]{48}$/.test(g1.d.accessToken), JSON.stringify(g1));
check("guest is stored as a 'guest' user without a login", (await q(`SELECT role FROM "User" WHERE email=$1`, [g1email]))[0].role === "guest");
const track = await anon.text("/track/" + g1.d.accessToken);
check("order opens from the private link", track.s === 200 && track.t.includes("Order #") && track.t.includes("Download invoice"), track.s);
check("guest order link is not indexed", track.t.includes("noindex"));
const inv1 = await anon.text(`/invoice/${g1.d.orderId}?t=${g1.d.accessToken}`);
check("invoice (same state): HSN, CGST and SGST, place of supply", inv1.s === 200 && inv1.t.includes("6109") && inv1.t.includes("CGST") && inv1.t.includes("SGST") && inv1.t.includes("Karnataka"), inv1.s);
const pdf1 = await fetch(`${BASE}/invoice/${g1.d.orderId}/pdf?t=${g1.d.accessToken}`);
const pdfBuf = Buffer.from(await pdf1.arrayBuffer());
check("invoice PDF downloads", pdf1.status === 200 && (pdf1.headers.get("content-type") || "").includes("application/pdf") && pdfBuf.subarray(0, 5).toString() === "%PDF-" && pdfBuf.length > 1500, pdf1.status);
check("invoice PDF needs the link or a login", (await fetch(`${BASE}/invoice/${g1.d.orderId}/pdf`)).status === 404 && (await fetch(`${BASE}/invoice/${g1.d.orderId}/pdf?t=${"1".repeat(48)}`)).status === 404);
check("invoice page needs the link or a login", [302, 307].includes((await anon.f(`/invoice/${g1.d.orderId}`)).status));
const g2 = await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", guestEmail: g1email, ...gaddr, shippingState: "27" } });
const inv2 = await anon.text(`/invoice/${g2.d.orderId}?t=${g2.d.accessToken}`);
check("invoice (other state): IGST only", inv2.t.includes("IGST") && !inv2.t.includes("SGST") && inv2.t.includes("Maharashtra"));
check("same guest email reuses one guest account", (await q(`SELECT count(*)::int c FROM "User" WHERE email=$1`, [g1email]))[0].c === 1);
const g3 = await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAL, qty: 1 }], paymentMethod: "online", guestEmail: g1email, ...gaddr } });
check("guest places an online order (pending)", g3.s === 201);
check("guest payment needs the order's private token", (await guestC.json("/api/payment/create-order", { method: "POST", json: { orderId: g3.d.orderId } })).s === 404 && (await guestC.json("/api/payment/create-order", { method: "POST", json: { orderId: g3.d.orderId, accessToken: "2".repeat(48) } })).s === 404);
const gp = await guestC.json("/api/payment/create-order", { method: "POST", json: { orderId: g3.d.orderId, accessToken: g3.d.accessToken } });
check("guest can start payment (or it fails gracefully)", gp.s === 200 || gp.s === 502, JSON.stringify(gp));
if (KEY_SECRET) {
  await q('UPDATE "Order" SET "razorpayOrderId"=$1 WHERE id=$2', ["order_GUEST", g3.d.orderId]);
  const v = { razorpay_order_id: "order_GUEST", razorpay_payment_id: "pay_GUEST", razorpay_signature: sig(KEY_SECRET, "order_GUEST|pay_GUEST") };
  check("guest payment is confirmed", (await guestC.json("/api/payment/verify", { method: "POST", json: v })).s === 200 && (await anon.text("/track/" + g3.d.accessToken)).t.toLowerCase().includes("paid"));
}
const gl = new C("10.1.0.40"); await gl.login(g1email, "anything-at-all");
check("a guest cannot log in", !(await gl.me()));
const mailsBefore = mailTo(g1email).length;
await anon.json("/api/auth/forgot-password", { method: "POST", json: { email: g1email } });
if (HAVE_MAIL) check("no password-reset email goes to a guest", !linkToken(g1email, "reset") && mailTo(g1email).length === mailsBefore);

console.log("\n# A guest creates an account");
await admin.json("/api/admin/orders/" + g1.d.orderId, { method: "PUT", json: { status: "delivered", note: "", courier: "", trackingNumber: "", trackingUrl: "", notify: false } });
const gr = await register(new C("10.1.0.41"), "Guest One", g1email, "GuestPass12345");
check("registering with a guest email is accepted", gr.s === 201);
check("nothing changes until the email is confirmed", (await q(`SELECT role FROM "User" WHERE email=$1`, [g1email]))[0].role === "guest");
const gl2 = new C("10.1.0.42"); await gl2.login(g1email, "GuestPass12345");
check("cannot log in before confirming", !(await gl2.me()));
check("confirm email", await confirmEmail(g1email));
if (HAVE_MAIL) {
  check("the account is now a customer with the chosen password", (await q(`SELECT role FROM "User" WHERE email=$1`, [g1email]))[0].role === "customer");
  const gl3 = new C("10.1.0.43"); await gl3.login(g1email, "GuestPass12345");
  check("log in with the new password", (await gl3.me())?.email === g1email);
  check("earlier guest orders are in the account", (await gl3.text("/orders")).t.includes(g1.d.orderId.slice(-8).toUpperCase()));
  check("and a return can be requested on them", (await gl3.json("/api/returns", { method: "POST", json: { orderId: g1.d.orderId, reason: "Wrong size", details: "" } })).s === 201);
} else skip("guest upgrade checks", "set E2E_MAIL_LOG to test them");

console.log("\n# Pay now, cancelling, Indian time and product markup");
const stockOf = async () => (await q('SELECT stock FROM "Variant" WHERE id=$1', [vAM]))[0].stock;
const stock0 = await stockOf();
const u1 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", ...addr } });
const u1page = await cust.text("/orders/" + u1.d.orderId);
check("an unpaid order offers Pay now and Cancel", u1page.t.includes("Pay now") && u1page.t.includes("Cancel order"), u1page.s);
check("stock is held by the unpaid order", (await stockOf()) === stock0 - 1);
check("another customer cannot cancel it", (await cust2.json(`/api/orders/${u1.d.orderId}/cancel`, { method: "POST", json: {} })).s === 404);
check("the customer cancels it", (await cust.json(`/api/orders/${u1.d.orderId}/cancel`, { method: "POST", json: {} })).s === 200 && (await q('SELECT status FROM "Order" WHERE id=$1', [u1.d.orderId]))[0].status === "cancelled");
check("cancelling put the stock back", (await stockOf()) === stock0);
check("cancelling twice is refused", (await cust.json(`/api/orders/${u1.d.orderId}/cancel`, { method: "POST", json: {} })).s === 409);
check("a paid order cannot be cancelled by the customer", (await cust.json(`/api/orders/${o2.d.orderId}/cancel`, { method: "POST", json: {} })).s === 409);
const k2 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", ...addr } });
check("a COD order can be cancelled before it ships", (await cust.json(`/api/orders/${k2.d.orderId}/cancel`, { method: "POST", json: {} })).s === 200);
const k3 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "cod", ...addr } });
await admin.json("/api/admin/orders/" + k3.d.orderId, { method: "PUT", json: { status: "shipped", note: "", courier: "DTDC", trackingNumber: "D1", trackingUrl: "", notify: false } });
check("a shipped COD order cannot be cancelled by the customer", (await cust.json(`/api/orders/${k3.d.orderId}/cancel`, { method: "POST", json: {} })).s === 409);
await admin.json("/api/admin/orders/" + k3.d.orderId, { method: "PUT", json: { status: "cancelled", note: "test", courier: "", trackingNumber: "", trackingUrl: "", notify: false } });
const gu = await guestC.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", guestEmail: "guest2@e2e.test", ...gaddr } });
check("a guest cannot cancel without the private link", (await guestC.json(`/api/orders/${gu.d.orderId}/cancel`, { method: "POST", json: {} })).s === 404 && (await guestC.json(`/api/orders/${gu.d.orderId}/cancel`, { method: "POST", json: { accessToken: "3".repeat(48) } })).s === 404);
check("the guest's track page offers Pay now", (await anon.text("/track/" + gu.d.accessToken)).t.includes("Pay now"));
check("a guest cancels with the private link", (await guestC.json(`/api/orders/${gu.d.orderId}/cancel`, { method: "POST", json: { accessToken: gu.d.accessToken } })).s === 200);
check("stock is back to where it started", (await stockOf()) === stock0);
await q(`UPDATE "Order" SET "createdAt"='2026-03-31 20:00:00+00' WHERE id=$1`, [g2.d.orderId]);
check("invoice date uses Indian time (20:00 UTC is 1 April in India)", (await anon.text(`/invoice/${g2.d.orderId}?t=${g2.d.accessToken}`)).t.includes("1/4/2026"));

const sa = await anon.text("/products/" + A.id);
check("product page has structured data and a canonical link", sa.t.includes("application/ld+json") && sa.t.includes('"@type":"Product"') && sa.t.includes('"priceCurrency":"INR"') && /rel="canonical"/.test(sa.t));

console.log("\n# Unpaid orders are released automatically");
{
  const stockNow = async () => (await q('SELECT stock FROM "Variant" WHERE id=$1', [vAM]))[0].stock;
  const e1 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", ...addr } });
  const held = await stockNow();
  await q(`UPDATE "Order" SET "createdAt" = now() - interval '3 hours' WHERE id=$1`, [e1.d.orderId]);
  const e2 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", ...addr } });
  check("a new purchase cancels stale unpaid orders without any scheduler", (await q('SELECT status FROM "Order" WHERE id=$1', [e1.d.orderId]))[0].status === "cancelled", JSON.stringify(e2.d));
  check("the stale order's stock became available again", (await stockNow()) === held);
  await cust.json(`/api/orders/${e2.d.orderId}/cancel`, { method: "POST", json: {} });
  const e3 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", ...addr } });
  check("a recent unpaid order is left alone", (await q('SELECT status FROM "Order" WHERE id=$1', [e3.d.orderId]))[0].status === "pending");
  await cust.json(`/api/orders/${e3.d.orderId}/cancel`, { method: "POST", json: {} });
  check("the scheduler route rejects a wrong secret", (await fetch(BASE + "/api/cron/expire-orders", { headers: { authorization: "Bearer undefined" } })).status === 401);
}

console.log("\n# Stock safety");
check("cannot order more than stock", [409, 400].includes((await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vB, qty: 9 }], paymentMethod: "online", ...addr } })).s));
const stockB = (await q('SELECT stock FROM "Variant" WHERE id=$1', [vB]))[0].stock;
const race = await Promise.all([1, 2, 3, 4, 5].map(() => cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vB, qty: 1 }], paymentMethod: "online", ...addr } })));
check(`${stockB} left: exactly ${stockB} of 5 racing buyers succeed`, race.filter((r) => r.s === 201).length === stockB, race.map((r) => r.s).join(","));
check("stock never goes negative", (await q('SELECT stock FROM "Variant" WHERE id=$1', [vB]))[0].stock === 0);

console.log("\n# Admin orders: search, filters, pages, couriers, labels");
await q(`INSERT INTO "Order"(id,"userId","accessToken",status,total,"shippingName","shippingPhone") SELECT 'bulk'||g, (SELECT id FROM "User" WHERE email='ravi@e2e.test'), 'bulktoken'||g, 'paid', 1000, 'Bulk Buyer '||g, '90000000'||lpad(g::text,2,'0') FROM generate_series(1,30) g`);
const ao = await admin.json("/api/admin/orders");
check("orders list returns pages and courier names", ao.s === 200 && Array.isArray(ao.d.orders) && ao.d.orders.length === 25 && ao.d.pages >= 2 && ao.d.couriers.includes("Delhivery"), JSON.stringify(ao.d).slice(0, 200));
check("no password hash in the orders list", !JSON.stringify(ao.d).includes("password"));
const pg2 = await admin.json("/api/admin/orders?page=2");
check("second page of orders", pg2.d.page === 2 && pg2.d.orders.length > 0);
const bulk = await admin.json("/api/admin/orders?q=Bulk%20Buyer&status=paid");
check("search by name + status filter", bulk.d.total === 30 && bulk.d.pages === 2);
check("search by order number", (await admin.json("/api/admin/orders?q=" + o1.d.orderId.slice(-8).toUpperCase())).d.orders.some((o) => o.id === o1.d.orderId));
check("search by phone", (await admin.json("/api/admin/orders?q=9123456780")).d.orders.some((o) => o.shippingName === "Guest One"));
check("search by email", (await admin.json("/api/admin/orders?q=guest1@e2e")).d.total >= 3);
check("filter by payment method", (await admin.json("/api/admin/orders?method=cod")).d.orders.every((o) => o.paymentMethod === "cod"));
check("filter by status", (await admin.json("/api/admin/orders?status=processing")).d.orders.every((o) => o.status === "processing"));
check("guest orders are marked in the list", (await admin.json("/api/admin/orders?q=guest1@e2e")).d.orders.some((o) => o.user.role === "guest" || o.user.role === "customer"));

const ship = (id, o = {}) => admin.json("/api/admin/orders/" + id, { method: "PUT", json: { status: "shipped", note: "On the way", courier: "Delhivery", trackingNumber: "DL 123", trackingUrl: "", notify: true, ...o } });
check("shipping needs a tracking number", (await ship(o1.d.orderId, { trackingNumber: "" })).s === 400);
check("tracking link must be a web address", (await ship(o1.d.orderId, { trackingUrl: "javascript:alert(1)" })).s === 400);
const shipped = await ship(o1.d.orderId);
check("shipped: tracking link built from the courier setting", shipped.s === 200 && shipped.d.trackingUrl === "https://track.example.com/t?awb=DL%20123", JSON.stringify(shipped.d));
check("response has no password hash", !JSON.stringify(shipped.d).includes("password"));
if (HAVE_MAIL) {
  const mail = mailTo("asha@e2e.test").filter((b) => b.includes("order shipped")).pop() || "";
  check("shipped email has the invoice PDF attached", /\[attachments: invoice-INV-\d+\.pdf/.test(mail) && mail.includes("Your invoice is attached") && mail.includes("track.example.com"), mail.slice(0, 300));
}
const typedUrl = await ship(o3.d.orderId, { courier: "Local courier", trackingNumber: "ZZ9", trackingUrl: "https://example.com/mine" });
check("a typed tracking link is kept", typedUrl.s === 200 && typedUrl.d.trackingUrl === "https://example.com/mine");
const deliv = await admin.json("/api/admin/orders/" + o1.d.orderId, { method: "PUT", json: { status: "delivered", note: "", courier: "Delhivery", trackingNumber: "DL 123", trackingUrl: "", notify: true } });
check("delivered sets the date", deliv.s === 200 && !!deliv.d.deliveredAt);
const label = await admin.text(`/admin/orders/${o1.d.orderId}/label`);
check("shipping label shows address, COD amount and items", label.s === 200 && label.t.includes("Ship to") && label.t.includes("Cash on Delivery: collect") && label.t.includes("Linen Shirt"), label.s);
check("labels are admin only", [302, 307].includes((await cust.f(`/admin/orders/${o1.d.orderId}/label`)).status));
const detail = await cust.text("/orders/" + o1.d.orderId);
check("customer order page (tracking, invoice, return form)", detail.s === 200 && detail.t.includes("DL 123") && detail.t.includes("Download invoice") && detail.t.includes("Request a return"), detail.s);
check("invoice for the owner has a PDF link", (await cust.text("/invoice/" + o1.d.orderId)).t.includes("Download PDF"));
check("invoice hidden from another customer", (await cust2.text("/invoice/" + o1.d.orderId)).s === 404 && (await cust2.text("/orders/" + o1.d.orderId)).s === 404);

console.log("\n# Returns, cancel and expiry");
check("another customer cannot return my order", (await cust2.json("/api/returns", { method: "POST", json: { orderId: o1.d.orderId, reason: "x", details: "" } })).s === 404);
const r1 = await cust.json("/api/returns", { method: "POST", json: { orderId: o1.d.orderId, reason: "Wrong size", details: "Too small" } });
check("request a return", r1.s === 201, JSON.stringify(r1.d));
check("duplicate return refused", (await cust.json("/api/returns", { method: "POST", json: { orderId: o1.d.orderId, reason: "again", details: "" } })).s === 409);
const rp = (status) => admin.json("/api/admin/returns/" + r1.d.id, { method: "PUT", json: { status, adminNote: "" } });
check("return steps are enforced, COD refund is recorded", (await rp("refunded")).s === 409 && (await rp("approved")).s === 200 && (await rp("received")).s === 200 && (await rp("refunded")).s === 200 && (await rp("refunded")).s === 409);
const cancelBody = (note) => ({ status: "cancelled", note, courier: "", trackingNumber: "", trackingUrl: "", notify: false });
check("cancel restores stock and coupon", (await admin.json("/api/admin/orders/" + o1.d.orderId, { method: "PUT", json: cancelBody("test") })).s === 200 && (await q('SELECT stock FROM "Variant" WHERE id=$1', [vAM]))[0].stock === 8);
check("coupon use restored", (await q('SELECT "usedCount" FROM "Coupon" WHERE code=$1', ["WELCOME10"]))[0].usedCount === 0);
check("a cancelled order cannot be reopened", (await admin.json("/api/admin/orders/" + o1.d.orderId, { method: "PUT", json: { ...cancelBody(""), status: "processing" } })).s === 409);
const o4 = await cust.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 2 }], paymentMethod: "online", ...addr } });
await q(`UPDATE "Order" SET "createdAt" = now() - interval '3 hours' WHERE id=$1`, [o4.d.orderId]);
check("cron needs the secret", (await anon.json("/api/cron/expire-orders")).s === 401);
if (CRON) {
  const cron = await fetch(BASE + "/api/cron/expire-orders", { headers: { authorization: "Bearer " + CRON } });
  check("cron cancels stale unpaid orders", cron.status === 200 && (await q('SELECT status FROM "Order" WHERE id=$1', [o4.d.orderId]))[0].status === "cancelled");
} else skip("cron expiry", "CRON_SECRET is not set");

console.log("\n# Reviews and wishlist");
await admin.json("/api/admin/orders/" + o3.d.orderId, { method: "PUT", json: { status: "delivered", note: "", courier: "Local courier", trackingNumber: "ZZ9", trackingUrl: "", notify: false } });
check("review needs a delivered purchase", (await cust2.json("/api/reviews", { method: "POST", json: { productId: B.id, rating: 5, comment: "Lovely piece" } })).s === 403);
check("customer reviews a delivered product", (await cust.json("/api/reviews", { method: "POST", json: { productId: A.id, rating: 4, comment: "Fits well, nice fabric" } })).s === 201);
const rvs = (await admin.json("/api/admin/reviews")).d;
check("review is hidden until approved, then public", !(await anon.text("/products/" + A.id)).t.includes("nice fabric") && (await admin.json("/api/admin/reviews/" + rvs[0].id, { method: "PUT", json: { status: "approved" } })).s === 200 && (await anon.text("/products/" + A.id)).t.includes("nice fabric"));
check("wishlist add, list, page, remove", (await cust.json("/api/wishlist", { method: "POST", json: { productId: A.id } })).d?.saved === true && (await cust.json("/api/wishlist")).d.includes(A.id) && (await cust.text("/wishlist")).t.includes("Linen Shirt") && (await cust.json("/api/wishlist", { method: "POST", json: { productId: A.id } })).d?.saved === false);

console.log("\n# Product editing");
const edit = await admin.json("/api/products/" + A.id, { method: "PUT", json: prod({ name: "Linen Shirt v2", price: 52900, comparePrice: 69900, hsnCode: "6205", variants: [{ id: vAM, size: "M", color: "Black", stock: 12 }, { size: "XL", color: "Black", stock: 4 }] }) });
check("edit keeps variant ids, adds one, drops one", edit.s === 200 && edit.d.variants.some((v) => v.id === vAM && v.stock === 12) && edit.d.variants.some((v) => v.size === "XL") && !edit.d.variants.some((v) => v.id === vAL) && edit.d.hsnCode === "6205");
check("a customer can still review after the size they bought was removed", (await cust.json("/api/reviews", { method: "POST", json: { productId: A.id, rating: 5, comment: "Updated: really nice fabric" } })).s === 201);
check("quick price patch and MRP guard", (await admin.json("/api/products/" + A.id, { method: "PATCH", json: { price: 54900, comparePrice: 69900 } })).s === 200 && (await admin.json("/api/products/" + A.id, { method: "PATCH", json: { price: 80000 } })).s === 400);
const dup = await admin.json("/api/admin/products/" + A.id + "/duplicate", { method: "POST" });
check("duplicate makes a hidden copy that keeps the HSN code", dup.s === 201 && (await q('SELECT active,"hsnCode" FROM "Product" WHERE id=$1', [dup.d.id]))[0].hsnCode === "6205");
check("hidden products are not in the shop", (await anon.text("/products/" + dup.d.id)).s === 404);
check("delete product", (await admin.json("/api/products/" + dup.d.id, { method: "DELETE" })).s === 200);
check("rename a category moves its products", (await admin.json("/api/admin/categories/" + c1.d.id, { method: "PUT", json: { name: "Apparel", imageUrl: "", position: 0, active: true, codAvailable: true, sizeChart: "" } })).s === 200 && (await q('SELECT category FROM "Product" WHERE id=$1', [A.id]))[0].category === "Apparel");
check("delete a category and move its products", (await admin.json("/api/admin/categories/" + c1.d.id, { method: "DELETE" })).s === 409 && (await admin.json("/api/admin/categories/" + c1.d.id + "?moveTo=Jewellery", { method: "DELETE" })).s === 200);

console.log("\n# Banners, pages, low stock, exports and admin pages");
check("banner: create, safe link only, shows on home", (await admin.json("/api/admin/banners", { method: "POST", json: { imageUrl: img, title: "Festive Sale", subtitle: "", buttonText: "Shop now", linkUrl: "/products?sale=1", position: 0, active: true, startsAt: null, endsAt: null } })).s === 201 && (await admin.json("/api/admin/banners", { method: "POST", json: { imageUrl: img, title: "x", subtitle: "", buttonText: "", linkUrl: "javascript:alert(1)", position: 0, active: true, startsAt: null, endsAt: null } })).s === 400 && (await anon.text("/")).t.includes("Festive Sale"));
await admin.json("/api/admin/pages/terms", { method: "PUT", json: { title: "Terms and Conditions", content: "Edited terms text" } });
check("edited page is live", (await anon.text("/terms")).t.includes("Edited terms text"));
check("low stock lists the sold-out necklace and quick restock works", (await admin.json("/api/admin/low-stock")).d.products.some((p) => p.name === "Gold Necklace") && (await admin.json("/api/admin/variants/" + vB, { method: "PUT", json: { stock: 15 } })).d?.stock === 15);
const exp = await admin.text("/api/admin/orders/export");
check("orders and customers CSV", exp.s === 200 && exp.h.get("content-type").includes("text/csv") && (await admin.text("/api/admin/customers/export")).t.includes("Asha"));
const custs = (await admin.json("/api/admin/customers")).d;
check("customers list has no password hashes", !JSON.stringify(custs).includes("password"));
const adminPages = ["/admin", "/admin/sales", "/admin/products", "/admin/products/new", "/admin/products/" + A.id, "/admin/categories", "/admin/low-stock", "/admin/orders", "/admin/customers", "/admin/customers/" + custs[0].id, "/admin/returns", "/admin/coupons", "/admin/banners", "/admin/reviews", "/admin/pages", "/admin/pages/privacy-policy", "/admin/settings"];
for (const p of adminPages) { const r = await admin.text(p); check("admin page " + p, r.s === 200, r.s); }

console.log("\n# Customer data export and account deletion");
check("data export needs login", (await anon.json("/api/account/export")).s === 401);
const exp1 = await cust.text("/api/account/export");
let expJson = null; try { expJson = JSON.parse(exp1.t); } catch {}
check("customer downloads their data", exp1.s === 200 && (exp1.h.get("content-disposition") || "").includes("my-data.json") && expJson?.account?.email === "asha@e2e.test" && expJson.orders.length > 0 && expJson.addresses.length > 0, exp1.s);
check("the export has no password hash or private links", !exp1.t.includes("password") && !exp1.t.includes("accessToken"));
check("an admin account cannot be deleted here", (await admin.json("/api/account/delete", { method: "POST", json: { password: ADMIN_PASS, confirm: "DELETE" } })).s === 403);
await register(new C("10.1.0.60"), "Gone Soon", "gone@e2e.test", "GonePass12345"); await confirmEmail("gone@e2e.test");
const gone = new C("10.1.0.61"); await gone.login("gone@e2e.test", "GonePass12345");
await gone.json("/api/account/addresses", { method: "POST", json: adr });
await gone.json("/api/wishlist", { method: "POST", json: { productId: A.id } });
const gOrd = await gone.json("/api/orders", { method: "POST", json: { items: [{ variantId: vAM, qty: 1 }], paymentMethod: "online", ...addr, shippingName: "Gone Soon" } });
check("deleting needs the password and the word DELETE", (await gone.json("/api/account/delete", { method: "POST", json: { password: "wrong", confirm: "DELETE" } })).s === 400 && (await gone.json("/api/account/delete", { method: "POST", json: { password: "GonePass12345", confirm: "yes" } })).s === 400);
check("cannot delete while an order is in progress", (await gone.json("/api/account/delete", { method: "POST", json: { password: "GonePass12345", confirm: "DELETE" } })).s === 409);
await gone.json(`/api/orders/${gOrd.d.orderId}/cancel`, { method: "POST", json: {} });
const gone2 = new C("10.1.0.62"); await gone2.login("gone@e2e.test", "GonePass12345");
check("a second login is open before deleting", (await gone2.me())?.email === "gone@e2e.test");
check("delete the account", (await gone.json("/api/account/delete", { method: "POST", json: { password: "GonePass12345", confirm: "DELETE" } })).s === 200);
const goneRow = (await q(`SELECT u.email,u.name,u.role,(SELECT count(*)::int FROM "Address" a WHERE a."userId"=u.id) addr,(SELECT count(*)::int FROM "Wishlist" w WHERE w."userId"=u.id) wish FROM "User" u WHERE u.id=(SELECT "userId" FROM "Order" WHERE id=$1)`, [gOrd.d.orderId]))[0];
check("personal data is removed from the account", /^deleted-.+@deleted\.invalid$/.test(goneRow.email) && goneRow.name === "Deleted customer" && goneRow.role === "deleted" && goneRow.addr === 0 && goneRow.wish === 0, JSON.stringify(goneRow));
const goneOrder = (await q('SELECT "shippingName","shippingPhone","shippingAddress",total,"shippingPincode" FROM "Order" WHERE id=$1', [gOrd.d.orderId]))[0];
check("the order record stays, without name, phone and address", goneOrder.shippingName === "Deleted customer" && goneOrder.shippingPhone === "" && goneOrder.total > 0 && goneOrder.shippingPincode === "560001", JSON.stringify(goneOrder));
check("every session of a deleted customer stops working at once", !(await gone.me()) && !(await gone2.me()));
const reLogin = new C("10.1.0.63"); await reLogin.login("gone@e2e.test", "GonePass12345");
check("the deleted account cannot log in", !(await reLogin.me()));
check("the email address can be used again", (await register(new C("10.1.0.64"), "Back Again", "gone@e2e.test", "GonePass12345")).s === 201);

console.log("\n# Sessions end when a password is reset");
{
  const r1 = new C("10.1.0.65"), r2 = new C("10.1.0.66");
  await r1.login("ravi@e2e.test", "RaviPass1234"); await r2.login("ravi@e2e.test", "RaviPass1234");
  check("two devices are logged in", !!(await r1.me()) && !!(await r2.me()));
  check("changing the password ends both sessions", (await r1.json("/api/account/password", { method: "PUT", json: { currentPassword: "RaviPass1234", newPassword: "RaviPass5678!" } })).s === 200 && !(await r1.me()) && !(await r2.me()));
  await q(`UPDATE "User" SET "sessionVersion"=0, password=(SELECT password FROM "User" WHERE email='asha@e2e.test') WHERE email='ravi@e2e.test'`);
}

console.log("\n# Two-factor login for admins");
await q(`INSERT INTO "User"(id,email,password,name,role,"emailVerified") VALUES ('e2e-admin2','admin2@e2e.test',$1,'Second Admin','admin',now())`, [await bcrypt.hash("SecondAdmin12345", 10)]);
const adm2 = new C("10.1.0.70"); await adm2.login("admin2@e2e.test", "SecondAdmin12345");
check("admin logs in with a password only (2FA is off)", (await adm2.me())?.role === "admin");
check("security page shows it is off", (await adm2.json("/api/admin/security")).d?.enabled === false);
check("a customer cannot reach the security pages", (await cust.json("/api/admin/security")).s === 403 && (await cust.json("/api/admin/security/setup", { method: "POST" })).s === 403);
const setup = await adm2.json("/api/admin/security/setup", { method: "POST" });
check("setup gives a secret and a QR code", setup.s === 200 && /^[A-Z2-7]{32}$/.test(setup.d.secret) && setup.d.qr.startsWith("data:image/png") && setup.d.otpauthUrl.startsWith("otpauth://totp/"), JSON.stringify(setup.d).slice(0, 120));
check("the secret is stored encrypted", !(await q(`SELECT "totpSecret" FROM "User" WHERE email='admin2@e2e.test'`))[0].totpSecret.includes(setup.d.secret));
const secret = setup.d.secret;
const accepted = [-30000, 0, 30000].map((d) => totpAt(secret, Date.now() + d));
const wrongCode = ["000000", "111111", "222222"].find((c) => !accepted.includes(c));
check("a wrong code does not turn it on", (await adm2.json("/api/admin/security/enable", { method: "POST", json: { code: wrongCode } })).s === 400);
const en = await adm2.json("/api/admin/security/enable", { method: "POST", json: { code: totpAt(secret) } });
check("the right code turns it on and gives 8 backup codes", en.s === 200 && en.d.recoveryCodes.length === 8 && /^[A-Z2-7]{5}-[A-Z2-7]{5}$/.test(en.d.recoveryCodes[0]), JSON.stringify(en));
check("backup codes are stored hashed", !(await q(`SELECT "recoveryCodes" FROM "User" WHERE email='admin2@e2e.test'`))[0].recoveryCodes.some((h) => en.d.recoveryCodes.includes(h)));
const l1 = new C("10.1.0.71"); const lr1 = await l1.login("admin2@e2e.test", "SecondAdmin12345");
check("a password alone no longer works", !(await l1.me()) && /TWO_FACTOR_REQUIRED/.test(lr1.url || ""), lr1.url);
const l3 = new C("10.1.0.73");
async function loginWithCode(client, code) {
  const { csrfToken } = await (await client.f("/api/auth/csrf")).json();
  const body = new URLSearchParams({ csrfToken, email: "admin2@e2e.test", password: "SecondAdmin12345", code, json: "true" }).toString();
  const r = await client.f("/api/auth/callback/credentials", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body });
  let d = {}; try { d = await r.json(); } catch {}
  return d;
}
const badRes = await loginWithCode(l3, wrongCode);
check("a wrong code is refused", !(await l3.me()) && /TWO_FACTOR_INVALID/.test(badRes.url || ""), badRes.url);
const goodCode = totpAt(secret, Date.now() + 30000); // the next window: the setup code is already used
await loginWithCode(l3, goodCode);
check("the right code logs in", (await l3.me())?.role === "admin");
const l4 = new C("10.1.0.74"); await loginWithCode(l4, goodCode);
check("the same code cannot be used twice", !(await l4.me()));
const l5 = new C("10.1.0.75"); await loginWithCode(l5, en.d.recoveryCodes[0]);
check("a backup code logs in", (await l5.me())?.role === "admin");
const l6 = new C("10.1.0.76"); await loginWithCode(l6, en.d.recoveryCodes[0]);
check("a backup code works only once", !(await l6.me()));
check("admin tools work after a two-factor login", (await l3.json("/api/admin/settings")).s === 200);
const noPass = await l3.json("/api/admin/security/disable", { method: "POST", json: { password: "wrong-password", code: en.d.recoveryCodes[1] } });
check("turning it off needs the password", noPass.s === 400);
check("turning it off works with password and a backup code", (await l3.json("/api/admin/security/disable", { method: "POST", json: { password: "SecondAdmin12345", code: en.d.recoveryCodes[1] } })).s === 200);
check("turning it off logs everyone out", !(await l3.me()) && !(await l5.me()));
const l7 = new C("10.1.0.77"); await l7.login("admin2@e2e.test", "SecondAdmin12345");
check("a password alone works again", (await l7.me())?.role === "admin");

console.log("\n# Activity log");
const act = await admin.json("/api/admin/activity?q=settings");
check("admin changes are logged with who and what", act.s === 200 && act.d.rows.some((r) => r.userEmail === "admin@e2e.test" && r.action === "PUT /api/admin/settings"), JSON.stringify(act.d).slice(0, 200));
check("sign-ins and two-factor changes are logged", (await admin.json("/api/admin/activity?q=two-factor")).d.rows.length >= 3 && (await admin.json("/api/admin/activity?q=login")).d.rows.some((r) => r.action === "login"));
check("failed two-factor attempts are logged", (await admin.json("/api/admin/activity?q=wrong two-factor")).d.rows.length >= 1);
check("data exports are logged", (await admin.json("/api/admin/activity?q=export")).d.rows.some((r) => r.action.includes("/export")));
check("customer privacy actions are logged without an email address", (await admin.json("/api/admin/activity?q=customer")).d.rows.some((r) => r.action === "customer deleted their account" && r.userEmail === ""));
check("the log never stores passwords", !JSON.stringify((await admin.json("/api/admin/activity?q=")).d).includes("SecondAdmin12345"));
check("the log has pages", (await admin.json("/api/admin/activity")).d.pages >= 1);
check("customers cannot read the log", (await cust.json("/api/admin/activity")).s === 403);
for (const p of ["/admin/activity", "/admin/security"]) { const r = await admin.text(p); check("admin page " + p, r.s === 200, r.s); }

console.log("\n# Contact, password reset and rate limits");
check("contact form and spam trap", (await anon.json("/api/contact", { method: "POST", json: { name: "Visitor", email: "v@e2e.test", message: "Do you ship to Pune?", website: "" } })).s === 200 && (await anon.json("/api/contact", { method: "POST", json: { name: "Bot", email: "b@e2e.test", message: "buy pills now", website: "http://spam" } })).s === 400);
check("forgot password gives the same answer for unknown emails", (await new C("10.1.0.50").json("/api/auth/forgot-password", { method: "POST", json: { email: "nobody@e2e.test" } })).s === 200);
await anon.json("/api/auth/forgot-password", { method: "POST", json: { email: "ravi@e2e.test" } });
const rt = linkToken("ravi@e2e.test", "reset");
if (rt) {
  check("reset password, once only", (await new C("10.1.0.51").json("/api/auth/reset-password", { method: "POST", json: { token: rt, password: "NewRaviPass999" } })).s === 200 && (await new C("10.1.0.51").json("/api/auth/reset-password", { method: "POST", json: { token: rt, password: "Another12345" } })).s === 400);
  const c3 = new C("10.1.0.52"); await c3.login("ravi@e2e.test", "NewRaviPass999");
  check("login with the new password", (await c3.me())?.email === "ravi@e2e.test");
} else skip("password reset link", "set E2E_MAIL_LOG to test it");
const bruteC = new C("10.1.0.99"); let lastUrl = "";
for (let i = 0; i < 10; i++) { const d = await bruteC.login("victim@e2e.test", "wrong-" + i); lastUrl = d.url || ""; }
check("too many wrong logins are blocked", /Too.{1,3}many/.test(decodeURIComponent(lastUrl)), lastUrl);

console.log(`\n${pass} passed, ${failN} failed, ${skipped} skipped`);
await db.end();
process.exit(failN ? 1 : 0);
