import crypto from "crypto";

// Time-based one-time passwords (RFC 6238), the kind Google Authenticator, Authy and 1Password produce.
const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer) {
  let bits = 0, value = 0, out = "";
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += ALPHA[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += ALPHA[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string) {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of s.replace(/=+$/, "").toUpperCase()) {
    const i = ALPHA.indexOf(ch);
    if (i < 0) continue;
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}

export const newSecret = () => base32Encode(crypto.randomBytes(20));

function hotp(key: Buffer, counter: number) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64BE(BigInt(counter));
  const h = crypto.createHmac("sha1", key).update(b).digest();
  const o = h[19] & 0xf;
  const code = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, "0");
}

const same = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Returns the 30-second step the code belongs to, or null. Codes from steps at or before `afterStep` are
// refused, so one code cannot be used twice. One step either side allows for clock drift.
export function verifyTotp(secret: string, code: string, afterStep = 0, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const key = base32Decode(secret);
  const step = Math.floor(now / 30000);
  for (const d of [-1, 0, 1]) {
    const s = step + d;
    if (s > afterStep && same(hotp(key, s), code)) return s;
  }
  return null;
}

export const totpUri = (secret: string, account: string, issuer: string) =>
  `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

// One-time backup codes for a lost phone, like ABCDE-FGHJK. Only their hashes are stored.
export const normalizeRecovery = (c: string) => c.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
export const hashRecovery = (c: string) => crypto.createHash("sha256").update(normalizeRecovery(c)).digest("hex");
export function newRecoveryCodes(n = 8) {
  const plain = Array.from({ length: n }, () => {
    const raw = Array.from(crypto.randomBytes(10), (b) => ALPHA[b % 32]).join("");
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
  return { plain, hashes: plain.map(hashRecovery) };
}
