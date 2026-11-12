import crypto from "crypto";

// Encrypts small secrets (such as two-factor keys) before they are stored in the database.
// The key comes from TWO_FACTOR_KEY, or from NEXTAUTH_SECRET if that is not set. Changing it makes
// existing two-factor setups unreadable (reset them with prisma/reset-2fa.ts).
function key() {
  const s = process.env.TWO_FACTOR_KEY || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET is not set");
  return crypto.createHash("sha256").update(s).digest();
}

export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}

export function decrypt(payload: string) {
  const [iv, tag, enc] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}
