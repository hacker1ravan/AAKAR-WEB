import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import OrderView from "@/components/OrderView";

export const metadata = { title: "Track your order", robots: { index: false } };

// Guests have no account, so their order link carries a long private token.
export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32,128}$/.test(token)) notFound();

  const [order, s] = await Promise.all([
    prisma.order.findUnique({
      where: { accessToken: token },
      include: { events: { orderBy: { createdAt: "asc" } }, returns: true, items: true, user: { select: { email: true, role: true } } },
    }),
    getSettings(),
  ]);
  if (!order) notFound();

  return (
    <OrderView
      order={order}
      returnWindowDays={s.returnWindowDays}
      invoiceHref={`/invoice/${order.id}?t=${token}`}
      guestEmail={order.user.role === "guest" ? order.user.email : undefined}
      guestToken={token}
    />
  );
}
