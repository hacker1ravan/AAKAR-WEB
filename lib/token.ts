import crypto from "crypto";

// Long random tokens for email links and guest order links
export const newToken = (bytes = 32) => crypto.randomBytes(bytes).toString("hex");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");

export function sameToken(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
