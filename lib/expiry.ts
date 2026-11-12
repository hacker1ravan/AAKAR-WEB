import { prisma } from "./prisma";
import { setOrderStatus } from "./orders";

// Unpaid online orders hold stock. After this long they are cancelled and the stock goes back on sale.
const HOLD_MINUTES = 60;

export async function expireStaleOrders() {
  const old = await prisma.order.findMany({
    where: { status: "pending", paymentMethod: "online", createdAt: { lt: new Date(Date.now() - HOLD_MINUTES * 60_000) } },
    select: { id: true },
    take: 100,
  });
  for (const o of old) {
    try {
      await setOrderStatus(o.id, "cancelled", { note: "Payment not completed", notify: false, onlyFrom: ["pending"] });
    } catch {
      // paid or changed a moment ago: leave it alone
    }
  }
  return old.length;
}

// Housekeeping: old counters, used or expired links, and activity older than a year.
export async function cleanupOldData() {
  const now = new Date();
  await Promise.all([
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }),
    prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.emailVerification.deleteMany({ where: { expiresAt: { lt: now } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 365 * 86400_000) } } }),
  ]);
}

// Runs on its own as people use the store, so unpaid orders are released even before a scheduler is set up.
// At most once every 5 minutes per server; the work is a single small query when nothing is due.
let last = 0, lastCleanup = 0;
export async function maybeExpireStaleOrders() {
  if (Date.now() - last < 5 * 60_000) return;
  last = Date.now();
  try {
    await expireStaleOrders();
    if (Date.now() - lastCleanup > 6 * 3600_000) { lastCleanup = Date.now(); await cleanupOldData(); }
  } catch (e) {
    console.error("expiry failed", e);
  }
}
