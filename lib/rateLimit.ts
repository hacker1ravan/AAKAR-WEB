import { prisma } from "./prisma";

export function clientIp(req?: { headers?: any }) {
  const h = req?.headers;
  const v = typeof h?.get === "function" ? h.get("x-forwarded-for") : h?.["x-forwarded-for"];
  return String(v ?? "unknown").split(",")[0].trim();
}

// returns true if the request is allowed
export async function rateLimit(key: string, max: number, windowSec: number) {
  try {
    const now = new Date();
    await prisma.rateLimit.deleteMany({ where: { key, resetAt: { lt: now } } });
    const row = await prisma.rateLimit.upsert({
      where: { key },
      update: { count: { increment: 1 } },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
    });
    return row.count <= max;
  } catch (e) {
    console.error("rateLimit", e);
    return true; // never block customers because of a database hiccup
  }
}
