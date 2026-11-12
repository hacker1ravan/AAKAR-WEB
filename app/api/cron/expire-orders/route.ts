import { expireStaleOrders, cleanupOldData } from "@/lib/expiry";
import { sameToken } from "@/lib/token";

// Optional scheduler hook. The store also releases unpaid orders by itself as it is used,
// so this only makes it happen on a fixed timetable.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || !given || !sameToken(given, secret)) return new Response("Unauthorized", { status: 401 });

  await cleanupOldData();
  return Response.json({ expired: await expireStaleOrders() });
}
