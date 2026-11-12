import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { requireUser } from "@/lib/requireUser";
import OrderView from "@/components/OrderView";

export const metadata = { title: "Order", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect(`/login?next=/orders/${id}`);

  const [order, s] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { events: { orderBy: { createdAt: "asc" } }, returns: true, items: true },
    }),
    getSettings(),
  ]);
  if (!order || (order.userId !== user.id && user.role !== "admin")) notFound();

  return <OrderView order={order} returnWindowDays={s.returnWindowDays} invoiceHref={`/invoice/${order.id}`} />;
}
